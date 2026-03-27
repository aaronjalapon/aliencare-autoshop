<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Inventory;
use App\Models\Report;
use App\Services\InventoryService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateAutomatedReports implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $reportType;

    public $reportDate;

    /**
     * Create a new job instance.
     */
    public function __construct(string $reportType, ?Carbon $reportDate = null)
    {
        $this->reportType = $reportType;
        $this->reportDate = $reportDate ?? now();
    }

    /**
     * Execute the job.
     */
    public function handle(InventoryService $inventoryService): void
    {
        try {
            match ($this->reportType) {
                'daily_usage' => $this->generateDailyUsageReport($inventoryService),
                'monthly_procurement' => $this->generateMonthlyProcurementReport($inventoryService),
                'low_stock_check' => $this->performLowStockCheck(),
                'reconciliation' => $this->generateReconciliationReport($inventoryService),
                default => throw new \InvalidArgumentException("Unknown report type: {$this->reportType}")
            };

            Log::info('Automated report generated successfully', [
                'report_type' => $this->reportType,
                'report_date' => $this->reportDate->format('Y-m-d'),
                'generated_at' => now(),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate automated report', [
                'report_type' => $this->reportType,
                'report_date' => $this->reportDate->format('Y-m-d'),
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Generate daily usage report.
     */
    private function generateDailyUsageReport(InventoryService $inventoryService): void
    {
        $startDate = $this->reportDate->copy()->startOfDay();
        $endDate = $this->reportDate->copy()->endOfDay();

        $analytics = $inventoryService->getUsageAnalytics($startDate, $endDate);

        $reportData = [
            'date' => $this->reportDate->format('Y-m-d'),
            'analytics' => $analytics,
            'generated_automatically' => true,
            'summary' => [
                'total_transactions' => array_sum(array_column($analytics['transaction_summary'], 'transaction_count')),
                'total_sales_value' => $analytics['transaction_summary']['sale']['total_value'] ?? 0,
                'total_procurement_value' => $analytics['transaction_summary']['procurement']['total_value'] ?? 0,
                'top_selling_item' => $analytics['top_moving_items']->first()['item_name'] ?? 'N/A',
            ],
        ];

        Report::create([
            'report_type' => 'daily_usage',
            'generated_date' => now(),
            'report_date' => $this->reportDate,
            'data_summary' => $reportData,
            'generated_by' => 'System - Automated Job',
        ]);
    }

    /**
     * Generate monthly procurement report.
     */
    private function generateMonthlyProcurementReport(InventoryService $inventoryService): void
    {
        $startDate = $this->reportDate->copy()->startOfMonth();
        $endDate = $this->reportDate->copy()->endOfMonth();

        $analytics = $inventoryService->getUsageAnalytics($startDate, $endDate);

        $procurementData = $analytics['transaction_summary']['procurement'] ?? [
            'transaction_count' => 0,
            'total_quantity' => 0,
            'total_value' => 0,
            'average_transaction_value' => 0,
        ];

        $reportData = [
            'month' => $this->reportDate->format('Y-m'),
            'procurement_summary' => $procurementData,
            'category_breakdown' => $analytics['category_performance'],
            'trends' => $this->calculateMonthlyTrends(),
            'generated_automatically' => true,
        ];

        Report::create([
            'report_type' => 'monthly_procurement',
            'generated_date' => now(),
            'report_date' => $startDate,
            'data_summary' => $reportData,
            'generated_by' => 'System - Automated Job',
        ]);
    }

    /**
     * Perform low stock check and generate alerts.
     */
    private function performLowStockCheck(): void
    {
        $lowStockItems = Inventory::lowStock()->active()->get();

        if ($lowStockItems->isEmpty()) {
            return;
        }

        $alertData = [
            'check_date' => $this->reportDate->format('Y-m-d'),
            'total_low_stock_items' => $lowStockItems->count(),
            'critical_items' => $lowStockItems->where('stock', 0)->count(),
            'items' => $lowStockItems->map(function ($item) {
                return [
                    'item_id' => $item->item_id,
                    'item_name' => $item->item_name,
                    'category' => $item->category,
                    'current_stock' => $item->stock,
                    'reorder_level' => $item->reorder_level,
                    'supplier' => $item->supplier,
                    'unit_price' => $item->unit_price,
                    'urgency' => $item->stock == 0 ? 'critical' : 'low',
                    'estimated_reorder_cost' => ($item->reorder_level * 2) * $item->unit_price,
                ];
            }),
            'total_estimated_reorder_cost' => $lowStockItems->sum(function ($item) {
                return ($item->reorder_level * 2) * $item->unit_price;
            }),
            'generated_automatically' => true,
        ];

        Report::create([
            'report_type' => 'low_stock_alert',
            'generated_date' => now(),
            'report_date' => $this->reportDate,
            'data_summary' => $alertData,
            'generated_by' => 'System - Automated Job',
        ]);
    }

    /**
     * Generate reconciliation report.
     */
    private function generateReconciliationReport(InventoryService $inventoryService): void
    {
        $summary = $inventoryService->getInventorySummary();

        $reportData = [
            'reconciliation_date' => $this->reportDate->format('Y-m-d'),
            'inventory_summary' => $summary,
            'discrepancies' => $this->findDiscrepancies(),
            'recommendations' => $this->generateRecommendations($summary),
            'generated_automatically' => true,
        ];

        Report::create([
            'report_type' => 'reconciliation',
            'generated_date' => now(),
            'report_date' => $this->reportDate,
            'data_summary' => $reportData,
            'generated_by' => 'System - Automated Job',
        ]);
    }

    /**
     * Calculate monthly trends by comparing with previous month.
     */
    private function calculateMonthlyTrends(): array
    {
        $currentMonth = $this->reportDate->copy()->startOfMonth();
        $previousMonth = $currentMonth->copy()->subMonth();

        // Get current month data
        $currentData = Report::where('report_type', 'monthly_procurement')
            ->whereYear('report_date', $currentMonth->year)
            ->whereMonth('report_date', $currentMonth->month)
            ->first();

        // Get previous month data
        $previousData = Report::where('report_type', 'monthly_procurement')
            ->whereYear('report_date', $previousMonth->year)
            ->whereMonth('report_date', $previousMonth->month)
            ->first();

        if (! $previousData) {
            return ['trend' => 'No previous data available'];
        }

        $currentValue = $currentData->data_summary['procurement_summary']['total_value'] ?? 0;
        $previousValue = $previousData->data_summary['procurement_summary']['total_value'] ?? 0;

        $percentageChange = $previousValue > 0 ? (($currentValue - $previousValue) / $previousValue) * 100 : 0;

        return [
            'current_month_value' => $currentValue,
            'previous_month_value' => $previousValue,
            'percentage_change' => round($percentageChange, 2),
            'trend' => $percentageChange > 0 ? 'increasing' : 'decreasing',
        ];
    }

    /**
     * Find inventory discrepancies.
     */
    private function findDiscrepancies(): array
    {
        // This would typically involve comparing system stock with physical counts
        // For now, we'll look for items with suspicious patterns

        $suspiciousItems = Inventory::active()
            ->where(function ($query) {
                $query->where('stock', '<', 0) // Negative stock
                    ->orWhereRaw('stock > reorder_level * 10'); // Excessive stock
            })
            ->get();

        return $suspiciousItems->map(function ($item) {
            $issue = $item->stock < 0 ? 'Negative stock' : 'Excessive stock';

            return [
                'item_id' => $item->item_id,
                'item_name' => $item->item_name,
                'current_stock' => $item->stock,
                'reorder_level' => $item->reorder_level,
                'issue' => $issue,
                'severity' => $item->stock < 0 ? 'high' : 'medium',
            ];
        })->toArray();
    }

    /**
     * Generate recommendations based on inventory summary.
     */
    private function generateRecommendations(array $summary): array
    {
        $recommendations = [];

        // Low stock recommendations
        if ($summary['alerts']['low_stock_items'] > 0) {
            $recommendations[] = [
                'type' => 'reorder',
                'priority' => 'high',
                'message' => "Review and reorder {$summary['alerts']['low_stock_items']} low stock items",
                'action' => 'Generate purchase orders for items below reorder level',
            ];
        }

        // Out of stock recommendations
        if ($summary['alerts']['critical_items'] > 0) {
            $recommendations[] = [
                'type' => 'urgent_reorder',
                'priority' => 'critical',
                'message' => "Immediate attention required for {$summary['alerts']['critical_items']} out-of-stock items",
                'action' => 'Emergency procurement or find alternative suppliers',
            ];
        }

        // Inventory optimization
        if ($summary['overview']['stock_accuracy'] < 95) {
            $recommendations[] = [
                'type' => 'accuracy',
                'priority' => 'medium',
                'message' => "Stock accuracy is below optimal level ({$summary['overview']['stock_accuracy']}%)",
                'action' => 'Conduct cycle counting and improve inventory management processes',
            ];
        }

        return $recommendations;
    }
}
