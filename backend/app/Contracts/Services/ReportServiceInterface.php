<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\Report;
use Carbon\Carbon;

/**
 * Interface for Report Service operations.
 *
 * Defines the contract for report generation including daily usage,
 * monthly procurement, reconciliation reports, and analytics.
 */
interface ReportServiceInterface
{
    /**
     * Get all reports with optional filtering.
     *
     * @param array{
     *     report_type?: string,
     *     start_date?: string,
     *     end_date?: string
     * } $filters Optional filters to apply
     * @param  int  $perPage  Number of items per page
     */
    public function getReports(array $filters = [], int $perPage = 15): \Illuminate\Contracts\Pagination\LengthAwarePaginator;

    /**
     * Get a single report by ID.
     *
     * @param  int  $id  Report ID
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getReport(int $id): Report;

    /**
     * Generate daily usage report.
     *
     * @param  Carbon  $date  Date to generate report for
     * @param  string  $generatedBy  Identity of who generated the report
     */
    public function generateDailyUsageReport(Carbon $date, string $generatedBy = 'System'): Report;

    /**
     * Generate monthly procurement report.
     *
     * @param  int  $year  Year for the report
     * @param  int  $month  Month for the report (1-12)
     * @param  string  $generatedBy  Identity of who generated the report
     */
    public function generateMonthlyProcurementReport(int $year, int $month, string $generatedBy = 'System'): Report;

    /**
     * Generate reconciliation report.
     *
     * @param  Carbon  $startDate  Start date of reconciliation period
     * @param  Carbon  $endDate  End date of reconciliation period
     * @param  string  $generatedBy  Identity of who generated the report
     */
    public function generateReconciliationReport(Carbon $startDate, Carbon $endDate, string $generatedBy = 'System'): Report;

    /**
     * Get dashboard analytics.
     *
     * @return array{
     *     inventory_value: float,
     *     low_stock_count: int,
     *     pending_reservations: int,
     *     today_transactions: int,
     *     weekly_sales: float,
     *     monthly_procurement: float
     * }
     */
    public function getDashboardAnalytics(): array;

    /**
     * Get usage analytics for a date range.
     *
     * @param  Carbon  $startDate  Start date
     * @param  Carbon  $endDate  End date
     */
    public function getUsageAnalytics(Carbon $startDate, Carbon $endDate): array;

    /**
     * Get procurement analytics for a date range.
     *
     * @param  Carbon  $startDate  Start date
     * @param  Carbon  $endDate  End date
     */
    public function getProcurementAnalytics(Carbon $startDate, Carbon $endDate): array;
}
