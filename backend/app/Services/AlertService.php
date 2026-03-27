<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\AlertRepositoryInterface;
use App\Contracts\Repositories\InventoryRepositoryInterface;
use App\Contracts\Services\AlertServiceInterface;
use App\Exceptions\AlertNotFoundException;
use App\Models\Alert;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Service class for alert management operations.
 *
 * Handles generating, acknowledging, and cleaning up alerts
 * for the inventory management system.
 */
class AlertService implements AlertServiceInterface
{
    public function __construct(
        private AlertRepositoryInterface $alertRepository,
        private InventoryRepositoryInterface $inventoryRepository
    ) {}

    /**
     * {@inheritDoc}
     */
    public function getAlerts(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->alertRepository->all($filters, $perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function generateLowStockAlerts(): array
    {
        $lowStockItems = $this->inventoryRepository->getLowStockItems();
        $created = 0;
        $updated = 0;
        $alerts = collect();

        foreach ($lowStockItems as $item) {
            $existingAlert = $this->alertRepository->findExistingLowStockAlert($item->item_id);

            if ($existingAlert) {
                // Update existing alert with current stock levels
                $this->alertRepository->update($existingAlert->id, [
                    'current_stock' => $item->stock,
                    'urgency' => $this->determineUrgency($item),
                    'message' => $this->generateAlertMessage($item),
                ]);
                $alerts->push($existingAlert->fresh());
                $updated++;
            } else {
                // Create new alert
                $alert = $this->alertRepository->create([
                    'item_id' => $item->item_id,
                    'item_name' => $item->item_name,
                    'current_stock' => $item->stock,
                    'reorder_level' => $item->reorder_level,
                    'category' => $item->category,
                    'supplier' => $item->supplier,
                    'urgency' => $this->determineUrgency($item),
                    'alert_type' => $item->stock === 0 ? 'out_of_stock' : 'low_stock',
                    'message' => $this->generateAlertMessage($item),
                    'acknowledged' => false,
                ]);
                $alerts->push($alert);
                $created++;
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'alerts' => $alerts,
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function getAlertStatistics(): array
    {
        $stats = $this->alertRepository->getStatistics();
        $recentAlerts = $this->alertRepository->getUnacknowledged()->take(5);

        return [
            'total_unacknowledged' => $stats['unacknowledged_alerts'],
            'by_urgency' => $stats['alerts_by_urgency'],
            'by_type' => $stats['alerts_by_type'],
            'recent_alerts' => $recentAlerts,
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function acknowledgeAlert(int $id, string $acknowledgedBy = 'System', ?string $notes = null): Alert
    {
        $alert = $this->alertRepository->findById($id);

        if (! $alert) {
            throw new AlertNotFoundException($id);
        }

        $updateData = [
            'acknowledged' => true,
            'acknowledged_by' => $acknowledgedBy,
            'acknowledged_at' => now(),
        ];

        if ($notes) {
            $existingMessage = $alert->message ?? '';
            $updateData['message'] = $existingMessage."\n\nNote: ".$notes;
        }

        return $this->alertRepository->update($id, $updateData);
    }

    /**
     * {@inheritDoc}
     */
    public function bulkAcknowledgeAlerts(array $ids, string $acknowledgedBy = 'System'): array
    {
        $acknowledgedCount = $this->alertRepository->bulkAcknowledge($ids, $acknowledgedBy);
        $failedCount = count($ids) - $acknowledgedCount;

        // Fetch the acknowledged alerts
        $alerts = collect();
        foreach ($ids as $id) {
            $alert = $this->alertRepository->findById($id);
            if ($alert && $alert->acknowledged) {
                $alerts->push($alert);
            }
        }

        return [
            'acknowledged_count' => $acknowledgedCount,
            'failed_count' => $failedCount,
            'alerts' => $alerts,
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function cleanupAlerts(int $daysOld = 30): array
    {
        $deletedCount = $this->alertRepository->cleanupOldAlerts($daysOld);

        return [
            'deleted_count' => $deletedCount,
            'message' => "Deleted {$deletedCount} alert(s) older than {$daysOld} days",
        ];
    }

    /**
     * Determine urgency level based on stock status.
     */
    private function determineUrgency(mixed $item): string
    {
        if ($item->stock === 0) {
            return 'critical';
        }

        $stockPercentage = $item->reorder_level > 0
            ? ($item->stock / $item->reorder_level) * 100
            : 100;

        if ($stockPercentage <= 25) {
            return 'critical';
        } elseif ($stockPercentage <= 50) {
            return 'high';
        } elseif ($stockPercentage <= 75) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Generate alert message based on item status.
     */
    private function generateAlertMessage(mixed $item): string
    {
        if ($item->stock === 0) {
            return "CRITICAL: {$item->item_name} is OUT OF STOCK. Immediate restocking required.";
        }

        $shortfall = $item->reorder_level - $item->stock;

        return sprintf(
            'Low stock alert for %s. Current: %d, Reorder Level: %d. Consider ordering %d units.',
            $item->item_name,
            $item->stock,
            $item->reorder_level,
            max($shortfall, $item->reorder_level)
        );
    }
}
