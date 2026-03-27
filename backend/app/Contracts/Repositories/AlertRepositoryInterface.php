<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Alert;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Interface for Alert Repository operations.
 *
 * Defines the contract for alert data access including CRUD operations,
 * acknowledgment, and statistics.
 */
interface AlertRepositoryInterface
{
    /**
     * Find an alert by its ID.
     *
     * @param int $id The unique identifier for the alert
     */
    public function findById(int|string $id): ?Alert;

    /**
     * Find an alert by ID or throw an exception.
     *
     * @param int $id The unique identifier for the alert
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function findByIdOrFail(int|string $id): Alert;

    /**
     * Get paginated alerts with optional filters.
     *
     * @param array{
     *     acknowledged?: bool,
     *     urgency?: string,
     *     alert_type?: string,
     *     item_id?: int
     * } $filters Optional filters to apply
     * @param int $perPage Number of items per page
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Create a new alert.
     *
     * @param array<string, mixed> $data The alert data
     */
    public function create(array $data): Alert;

    /**
     * Update an existing alert.
     *
     * @param int $id The unique identifier for the alert
     * @param array<string, mixed> $data The data to update
     */
    public function update(int|string $id, array $data): Alert;

    /**
     * Get all unacknowledged alerts.
     */
    public function getUnacknowledged(): Collection;

    /**
     * Get alerts by urgency level.
     *
     * @param string $urgency The urgency level (low, medium, high, critical)
     */
    public function getByUrgency(string $urgency): Collection;

    /**
     * Find an existing low stock alert for an inventory item.
     *
     * @param int $itemId The inventory item ID
     */
    public function findExistingLowStockAlert(int $itemId): ?Alert;

    /**
     * Bulk acknowledge multiple alerts.
     *
     * @param array<int> $ids Array of alert IDs to acknowledge
     * @param string $acknowledgedBy Identity of who acknowledged the alerts
     *
     * @return int Number of alerts acknowledged
     */
    public function bulkAcknowledge(array $ids, string $acknowledgedBy): int;

    /**
     * Delete old acknowledged alerts.
     *
     * @param int $daysOld Delete alerts acknowledged more than this many days ago
     *
     * @return int Number of alerts deleted
     */
    public function cleanupOldAlerts(int $daysOld): int;

    /**
     * Get alert statistics and summary.
     *
     * @return array{
     *     total_alerts: int,
     *     unacknowledged_alerts: int,
     *     acknowledged_alerts: int,
     *     critical_alerts: int,
     *     high_priority_alerts: int,
     *     alerts_by_urgency: array<string, int>,
     *     alerts_by_type: array<string, int>
     * }
     */
    public function getStatistics(): array;
}
