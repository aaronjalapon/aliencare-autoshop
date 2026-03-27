<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\Alert;

/**
 * Interface for Alert Service operations.
 *
 * Defines the contract for alert management including generating,
 * acknowledging, and cleaning up alerts.
 */
interface AlertServiceInterface
{
    /**
     * Get all alerts with optional filtering.
     *
     * @param array{
     *     type?: string,
     *     urgency?: string,
     *     acknowledged?: bool,
     *     item_id?: string
     * } $filters Optional filters to apply
     * @param  int  $perPage  Number of items per page
     */
    public function getAlerts(array $filters = [], int $perPage = 15): \Illuminate\Contracts\Pagination\LengthAwarePaginator;

    /**
     * Generate low stock alerts for items below reorder level.
     *
     * @return array{
     *     created: int,
     *     updated: int,
     *     alerts: \Illuminate\Support\Collection
     * }
     */
    public function generateLowStockAlerts(): array;

    /**
     * Get alert statistics and summary.
     *
     * @return array{
     *     total_unacknowledged: int,
     *     by_urgency: array,
     *     by_type: array,
     *     recent_alerts: \Illuminate\Support\Collection
     * }
     */
    public function getAlertStatistics(): array;

    /**
     * Acknowledge a specific alert.
     *
     * @param  int  $id  Alert ID
     * @param  string  $acknowledgedBy  Identity of who acknowledged
     * @param  string|null  $notes  Optional notes
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function acknowledgeAlert(int $id, string $acknowledgedBy = 'System', ?string $notes = null): Alert;

    /**
     * Bulk acknowledge multiple alerts.
     *
     * @param  array<int>  $ids  Array of alert IDs
     * @param  string  $acknowledgedBy  Identity of who acknowledged
     * @return array{
     *     acknowledged_count: int,
     *     failed_count: int,
     *     alerts: \Illuminate\Support\Collection
     * }
     */
    public function bulkAcknowledgeAlerts(array $ids, string $acknowledgedBy = 'System'): array;

    /**
     * Cleanup old acknowledged alerts.
     *
     * @param  int  $daysOld  Delete alerts older than this many days
     * @return array{
     *     deleted_count: int,
     *     message: string
     * }
     */
    public function cleanupAlerts(int $daysOld = 30): array;
}
