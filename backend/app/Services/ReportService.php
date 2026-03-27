<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\InventoryRepositoryInterface;
use App\Contracts\Repositories\ReportRepositoryInterface;
use App\Contracts\Repositories\ReservationRepositoryInterface;
use App\Contracts\Repositories\StockTransactionRepositoryInterface;
use App\Contracts\Services\ReportServiceInterface;
use App\Models\Report;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Service class for report generation operations.
 *
 * Handles generating daily usage, monthly procurement, reconciliation
 * reports, and analytics dashboards.
 */
class ReportService implements ReportServiceInterface
{
    public function __construct(
        private ReportRepositoryInterface $reportRepository,
        private InventoryRepositoryInterface $inventoryRepository,
        private ReservationRepositoryInterface $reservationRepository,
        private StockTransactionRepositoryInterface $transactionRepository
    ) {}

    /**
     * {@inheritDoc}
     */
    public function getReports(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->reportRepository->all($filters, $perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function getReport(int $id): Report
    {
        return $this->reportRepository->findByIdOrFail($id);
    }

    /**
     * {@inheritDoc}
     */
    public function generateDailyUsageReport(Carbon $date, string $generatedBy = 'System'): Report
    {
        $startOfDay = $date->copy()->startOfDay();
        $endOfDay = $date->copy()->endOfDay();

        $transactions = $this->transactionRepository->getByDateRange($startOfDay, $endOfDay);

        $summary = [
            'date' => $date->toDateString(),
            'total_transactions' => $transactions->count(),
            'by_type' => $transactions->groupBy('transaction_type')
                ->map(fn ($group) => [
                    'count' => $group->count(),
                    'total_quantity' => $group->sum(fn ($t) => abs($t->quantity)),
                ]),
            'top_items' => $transactions->groupBy('item_id')
                ->map(fn ($group) => [
                    'item_name' => $group->first()->inventory->item_name ?? 'Unknown',
                    'transaction_count' => $group->count(),
                    'total_quantity' => $group->sum(fn ($t) => abs($t->quantity)),
                ])
                ->sortByDesc('transaction_count')
                ->take(10)
                ->values(),
        ];

        return $this->reportRepository->create([
            'report_type' => 'daily_usage',
            'generated_date' => now(),
            'report_date' => $date->toDateString(),
            'data_summary' => $summary,
            'generated_by' => $generatedBy,
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function generateMonthlyProcurementReport(int $year, int $month, string $generatedBy = 'System'): Report
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $transactions = $this->transactionRepository->getByDateRange($startDate, $endDate)
            ->where('transaction_type', 'procurement');

        $summary = [
            'period' => [
                'year' => $year,
                'month' => $month,
                'month_name' => $startDate->format('F'),
            ],
            'total_procurements' => $transactions->count(),
            'total_quantity' => $transactions->sum('quantity'),
            'total_value' => $transactions->sum(function ($t) {
                return $t->quantity * ($t->inventory->unit_price ?? 0);
            }),
            'by_category' => $transactions->groupBy(fn ($t) => $t->inventory->category ?? 'Unknown')
                ->map(fn ($group) => [
                    'count' => $group->count(),
                    'quantity' => $group->sum('quantity'),
                    'value' => $group->sum(fn ($t) => $t->quantity * ($t->inventory->unit_price ?? 0)),
                ]),
            'by_supplier' => $transactions->groupBy(fn ($t) => $t->inventory->supplier ?? 'Unknown')
                ->map(fn ($group) => [
                    'count' => $group->count(),
                    'quantity' => $group->sum('quantity'),
                ]),
            'daily_breakdown' => $transactions->groupBy(fn ($t) => $t->created_at->toDateString())
                ->map(fn ($group) => [
                    'count' => $group->count(),
                    'quantity' => $group->sum('quantity'),
                ]),
        ];

        return $this->reportRepository->create([
            'report_type' => 'monthly_procurement',
            'generated_date' => now(),
            'report_date' => $startDate->toDateString(),
            'data_summary' => $summary,
            'generated_by' => $generatedBy,
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function generateReconciliationReport(Carbon $startDate, Carbon $endDate, string $generatedBy = 'System'): Report
    {
        $activeItems = $this->inventoryRepository->getActiveItems();
        $transactions = $this->transactionRepository->getByDateRange($startDate, $endDate);

        $reconciliation = $activeItems->map(function ($item) use ($transactions, $startDate) {
            $itemTransactions = $transactions->where('item_id', $item->item_id);

            $totalIn = $itemTransactions->filter(fn ($t) => $t->quantity > 0)->sum('quantity');
            $totalOut = $itemTransactions->filter(fn ($t) => $t->quantity < 0)->sum(fn ($t) => abs($t->quantity));

            $firstTransaction = $itemTransactions->sortBy('created_at')->first();
            $expectedStock = $firstTransaction
                ? $firstTransaction->previous_stock + $totalIn - $totalOut
                : $item->stock;

            return [
                'item_id' => $item->item_id,
                'item_name' => $item->item_name,
                'category' => $item->category,
                'current_stock' => $item->stock,
                'expected_stock' => $expectedStock,
                'discrepancy' => $item->stock - $expectedStock,
                'total_in' => $totalIn,
                'total_out' => $totalOut,
                'transaction_count' => $itemTransactions->count(),
            ];
        })->values();

        $discrepancies = $reconciliation->filter(fn ($item) => $item['discrepancy'] !== 0);

        $summary = [
            'period' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'total_items_checked' => $reconciliation->count(),
            'items_with_discrepancy' => $discrepancies->count(),
            'total_discrepancy_value' => $discrepancies->sum(function ($item) use ($activeItems) {
                $inventory = $activeItems->firstWhere('item_id', $item['item_id']);
                return abs($item['discrepancy']) * ($inventory->unit_price ?? 0);
            }),
            'discrepancies' => $discrepancies->take(20)->values(),
            'accuracy_rate' => $reconciliation->count() > 0
                ? round((1 - $discrepancies->count() / $reconciliation->count()) * 100, 2)
                : 100,
        ];

        return $this->reportRepository->create([
            'report_type' => 'reconciliation',
            'generated_date' => now(),
            'report_date' => $endDate->toDateString(),
            'data_summary' => $summary,
            'generated_by' => $generatedBy,
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function getDashboardAnalytics(): array
    {
        $today = Carbon::today();
        $weekAgo = $today->copy()->subWeek();
        $monthAgo = $today->copy()->subMonth();

        $todayTransactions = $this->transactionRepository
            ->getByDateRange($today->startOfDay(), $today->endOfDay());

        $weeklySales = $this->transactionRepository
            ->getByDateRange($weekAgo, $today)
            ->where('transaction_type', 'sale')
            ->sum(function ($t) {
                return abs($t->quantity) * ($t->inventory->unit_price ?? 0);
            });

        $monthlyProcurement = $this->transactionRepository
            ->getByDateRange($monthAgo, $today)
            ->where('transaction_type', 'procurement')
            ->sum(function ($t) {
                return $t->quantity * ($t->inventory->unit_price ?? 0);
            });

        return [
            'inventory_value' => $this->inventoryRepository->getTotalInventoryValue(),
            'low_stock_count' => $this->inventoryRepository->getLowStockItems()->count(),
            'pending_reservations' => $this->reservationRepository->getPendingCount(),
            'today_transactions' => $todayTransactions->count(),
            'weekly_sales' => $weeklySales,
            'monthly_procurement' => $monthlyProcurement,
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function getUsageAnalytics(Carbon $startDate, Carbon $endDate): array
    {
        $transactions = $this->transactionRepository->getByDateRange($startDate, $endDate);

        return [
            'period' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'days' => $startDate->diffInDays($endDate) + 1,
            ],
            'total_transactions' => $transactions->count(),
            'by_type' => $transactions->groupBy('transaction_type')
                ->map(fn ($group) => [
                    'count' => $group->count(),
                    'quantity' => $group->sum(fn ($t) => abs($t->quantity)),
                ]),
            'top_items' => $transactions->groupBy('item_id')
                ->map(fn ($group) => [
                    'item_id' => $group->first()->item_id,
                    'item_name' => $group->first()->inventory->item_name ?? 'Unknown',
                    'transaction_count' => $group->count(),
                ])
                ->sortByDesc('transaction_count')
                ->take(10)
                ->values(),
            'daily_summary' => $transactions->groupBy(fn ($t) => $t->created_at->toDateString())
                ->map(fn ($group) => $group->count()),
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function getProcurementAnalytics(Carbon $startDate, Carbon $endDate): array
    {
        $transactions = $this->transactionRepository->getByDateRange($startDate, $endDate)
            ->where('transaction_type', 'procurement');

        return [
            'period' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'total_procurements' => $transactions->count(),
            'total_quantity' => $transactions->sum('quantity'),
            'total_value' => $transactions->sum(function ($t) {
                return $t->quantity * ($t->inventory->unit_price ?? 0);
            }),
            'by_supplier' => $transactions->groupBy(fn ($t) => $t->inventory->supplier ?? 'Unknown')
                ->map(fn ($group) => [
                    'count' => $group->count(),
                    'quantity' => $group->sum('quantity'),
                    'value' => $group->sum(fn ($t) => $t->quantity * ($t->inventory->unit_price ?? 0)),
                ]),
            'by_category' => $transactions->groupBy(fn ($t) => $t->inventory->category ?? 'Unknown')
                ->map(fn ($group) => [
                    'count' => $group->count(),
                    'quantity' => $group->sum('quantity'),
                ]),
        ];
    }
}
