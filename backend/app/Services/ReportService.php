<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\InventoryRepositoryInterface;
use App\Contracts\Repositories\ReportRepositoryInterface;
use App\Contracts\Repositories\ReservationRepositoryInterface;
use App\Contracts\Repositories\StockTransactionRepositoryInterface;
use App\Contracts\Services\ReportServiceInterface;
use App\Enums\JobOrderStatus;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\Report;
use App\Models\StockTransaction;
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

        $reconciliation = $activeItems->map(function ($item) use ($transactions) {
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
    public function generateDailyFinancialReport(Carbon $date, string $generatedBy = 'System'): Report
    {
        $startOfDay = $date->copy()->startOfDay();
        $endOfDay = $date->copy()->endOfDay();

        $transactions = CustomerTransaction::query()
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->get();

        $paidTransactions = $transactions->filter(fn ($t) => $t->xendit_status === 'PAID');
        $pendingTransactions = $transactions->filter(fn ($t) => $t->xendit_status !== 'PAID');

        $totalRevenue = $paidTransactions->sum('amount');
        $pendingAmount = $pendingTransactions->sum('amount');
        $totalTransactions = $transactions->count();

        $byPaymentMethod = $transactions
            ->groupBy('payment_method')
            ->map(fn ($group) => [
                'count' => $group->count(),
                'total' => $group->sum('amount'),
            ]);

        $byType = $transactions
            ->groupBy('type')
            ->map(fn ($group) => [
                'count' => $group->count(),
                'total' => $group->sum('amount'),
            ]);

        $summary = [
            'date' => $date->toDateString(),
            'total_revenue' => $totalRevenue,
            'pending_amount' => $pendingAmount,
            'total_transactions' => $totalTransactions,
            'by_payment_method' => $byPaymentMethod,
            'by_type' => $byType,
        ];

        return $this->reportRepository->create([
            'report_type' => 'daily_financial',
            'generated_date' => now(),
            'report_date' => $date->toDateString(),
            'data_summary' => $summary,
            'generated_by' => $generatedBy,
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function getDashboardAnalytics(?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $today = Carbon::today();
        $todayStart = $today->copy()->startOfDay();
        $todayEnd = $today->copy()->endOfDay();
        $weekAgo = $todayStart->copy()->subDays(6);
        $monthAgo = $todayStart->copy()->subDays(29);

        $rangeStart = $startDate?->copy()->startOfDay();
        $rangeEnd = $endDate?->copy()->endOfDay();
        $useRange = $rangeStart !== null && $rangeEnd !== null;

        $inventoryValue = $this->inventoryRepository->getTotalInventoryValue();
        $activeItemsCount = $this->inventoryRepository->getActiveItems()->count();
        $lowStockCount = $this->inventoryRepository->getLowStockItems()->count();
        $pendingReservations = $this->reservationRepository->getPendingCount();
        $activeReservations = $this->reservationRepository->getActiveReservations()->count();

        $todayTransactions = $this->transactionRepository
            ->getByDateRange($useRange ? $rangeStart : $todayStart, $useRange ? $rangeEnd : $todayEnd);

        $weeklySales = $this->transactionRepository
            ->getByDateRange($useRange ? $rangeStart : $weekAgo, $useRange ? $rangeEnd : $todayEnd)
            ->where('transaction_type', 'sale')
            ->sum(function ($t) {
                return abs($t->quantity) * ($t->inventory->unit_price ?? 0);
            });

        $monthlyProcurement = $this->transactionRepository
            ->getByDateRange($useRange ? $rangeStart : $monthAgo, $useRange ? $rangeEnd : $todayEnd)
            ->where('transaction_type', 'procurement')
            ->sum(function ($t) {
                return $t->quantity * ($t->inventory->unit_price ?? 0);
            });

        $recentTransactions = $this->transactionRepository
            ->getByDateRange($useRange ? $rangeStart : $weekAgo, $useRange ? $rangeEnd : $todayEnd)
            ->take(10)
            ->values()
            ->map(fn ($transaction) => [
                'id' => $transaction->id,
                'item_id' => $transaction->item_id,
                'transaction_type' => (string) $transaction->transaction_type,
                'quantity' => (int) $transaction->quantity,
                'created_at' => $transaction->created_at?->toISOString(),
                'inventory_item' => [
                    'item_id' => $transaction->inventory->item_id ?? null,
                    'item_name' => $transaction->inventory->item_name ?? null,
                ],
            ]);

        $topCategories = $this->inventoryRepository
            ->getCategoryBreakdown()
            ->sortByDesc('total_value')
            ->take(6)
            ->values()
            ->map(fn ($category) => [
                'category' => (string) ($category->category ?? 'General'),
                'count' => (int) ($category->count ?? 0),
                'value' => (float) ($category->total_value ?? 0),
            ]);

        $statusQuery = JobOrder::query()->selectRaw('status, COUNT(*) as count');
        if ($useRange) {
            $statusQuery->whereBetween('updated_at', [$rangeStart, $rangeEnd]);
        }
        $statusCounts = $statusQuery->groupBy('status')->pluck('count', 'status');

        $completedJobs = (int) ($statusCounts[JobOrderStatus::Completed->value] ?? 0)
            + (int) ($statusCounts[JobOrderStatus::Settled->value] ?? 0);
        $inProgressJobs = (int) ($statusCounts[JobOrderStatus::InProgress->value] ?? 0);
        $queuedJobs = (int) ($statusCounts[JobOrderStatus::Created->value] ?? 0)
            + (int) ($statusCounts[JobOrderStatus::PendingApproval->value] ?? 0)
            + (int) ($statusCounts[JobOrderStatus::Approved->value] ?? 0);

        $monthlyTrends = collect();

        if ($useRange) {
            $periodStart = $rangeStart->copy()->startOfMonth();
            $periodEnd = $rangeEnd->copy()->startOfMonth();
            $months = [];

            for ($cursor = $periodStart->copy(); $cursor->lte($periodEnd); $cursor->addMonth()) {
                $months[] = $cursor->copy();
            }

            $monthlyTrends = collect($months)->map(function (Carbon $monthStart) use ($rangeStart, $rangeEnd) {
                $monthEnd = $monthStart->copy()->endOfMonth();

                $bucketStart = $rangeStart->copy();
                if ($monthStart->gt($bucketStart)) {
                    $bucketStart = $monthStart->copy();
                }

                $bucketEnd = $rangeEnd->copy();
                if ($monthEnd->lt($bucketEnd)) {
                    $bucketEnd = $monthEnd->copy();
                }

                $procurementValue = (float) StockTransaction::query()
                    ->where('transaction_type', 'procurement')
                    ->whereBetween('created_at', [$bucketStart, $bucketEnd])
                    ->get()
                    ->sum(fn ($t) => (int) $t->quantity * (float) ($t->inventory->unit_price ?? 0));

                $usageValue = (float) StockTransaction::query()
                    ->where('transaction_type', '!=', 'procurement')
                    ->where('quantity', '<', 0)
                    ->whereBetween('created_at', [$bucketStart, $bucketEnd])
                    ->get()
                    ->sum(fn ($t) => abs((int) $t->quantity) * (float) ($t->inventory->unit_price ?? 0));

                return [
                    'month' => $monthStart->format('M Y'),
                    'procurement_value' => round($procurementValue, 2),
                    'usage_value' => round($usageValue, 2),
                ];
            })->values();
        } else {
            // Compute real monthly trends for the last 6 months.
            $monthlyTrends = collect(range(5, 0))->map(function (int $monthsAgo) {
                $monthStart = Carbon::today()->subMonths($monthsAgo)->startOfMonth();
                $monthEnd = $monthStart->copy()->endOfMonth();

                $procurementValue = (float) StockTransaction::query()
                    ->where('transaction_type', 'procurement')
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->get()
                    ->sum(fn ($t) => (int) $t->quantity * (float) ($t->inventory->unit_price ?? 0));

                $usageValue = (float) StockTransaction::query()
                    ->where('transaction_type', '!=', 'procurement')
                    ->where('quantity', '<', 0)
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->get()
                    ->sum(fn ($t) => abs((int) $t->quantity) * (float) ($t->inventory->unit_price ?? 0));

                return [
                    'month' => $monthStart->format('M Y'),
                    'procurement_value' => round($procurementValue, 2),
                    'usage_value' => round($usageValue, 2),
                ];
            })->values();
        }

        return [
            'inventory_value' => $inventoryValue,
            'low_stock_count' => $lowStockCount,
            'pending_reservations' => $pendingReservations,
            'today_transactions' => $todayTransactions->count(),
            'weekly_sales' => (float) $weeklySales,
            'monthly_procurement' => (float) $monthlyProcurement,
            'job_pipeline' => [
                'completed' => $completedJobs,
                'in_progress' => $inProgressJobs,
                'queued' => $queuedJobs,
            ],

            // Compatibility keys used by inventory dashboard widgets.
            'total_items' => $activeItemsCount,
            'total_value' => $inventoryValue,
            'active_reservations' => $activeReservations,
            'recent_transactions' => $recentTransactions,
            'top_categories' => $topCategories,
            'monthly_trends' => $monthlyTrends->all(),
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function getUsageAnalytics(Carbon $startDate, Carbon $endDate): array
    {
        $rangeStart = $startDate->copy()->startOfDay();
        $rangeEnd = $endDate->copy()->endOfDay();
        $transactions = $this->transactionRepository->getByDateRange($rangeStart, $rangeEnd);

        $usageTransactions = $transactions->filter(function (StockTransaction $transaction): bool {
            return $transaction->transaction_type !== 'procurement' && (int) $transaction->quantity < 0;
        });

        $usageByItem = $usageTransactions
            ->groupBy('item_id')
            ->map(function ($group, $itemId) {
                /** @var StockTransaction|null $first */
                $first = $group->first();
                $inventory = $first?->inventory;
                $unitPrice = (float) ($inventory->unit_price ?? 0);
                $consumed = (int) $group->sum(fn (StockTransaction $transaction) => abs((int) $transaction->quantity));
                $resolvedItemId = (int) ($inventory->item_id ?? $itemId ?? 0);
                $partNumber = trim((string) ($inventory->sku ?? ''));

                return [
                    'item_id' => $resolvedItemId,
                    'item_name' => (string) ($inventory->item_name ?? 'Unknown Item'),
                    'part_number' => $partNumber !== '' ? $partNumber : sprintf('ITEM-%d', max(1, $resolvedItemId)),
                    'description' => (string) ($inventory->description ?? ''),
                    'category' => (string) ($inventory->category ?? 'General'),
                    'consumed' => $consumed,
                    'cost' => round($consumed * $unitPrice, 2),
                    'unit_price' => $unitPrice,
                    'transaction_count' => (int) $group->count(),
                ];
            })
            ->sortByDesc('consumed')
            ->values();

        $categoryBreakdown = $usageByItem
            ->groupBy('category')
            ->map(function ($group, $category) {
                return [
                    'category' => (string) $category,
                    'consumed' => (int) $group->sum('consumed'),
                    'cost' => round((float) $group->sum('cost'), 2),
                    'item_count' => (int) $group->count(),
                ];
            })
            ->sortByDesc('consumed')
            ->values();

        $topConsumedItems = $usageByItem->take(10)->values();
        $mostUsedItem = $topConsumedItems->first();

        $byType = $usageTransactions
            ->groupBy('transaction_type')
            ->map(fn ($group) => [
                'count' => (int) $group->count(),
                'quantity' => (int) $group->sum(fn (StockTransaction $transaction) => abs((int) $transaction->quantity)),
            ]);

        $dailySummary = $usageTransactions
            ->groupBy(fn (StockTransaction $transaction) => $transaction->created_at->toDateString())
            ->map(fn ($group, $date) => [
                'date' => (string) $date,
                'count' => (int) $group->count(),
            ])
            ->sortBy('date')
            ->values();

        $totalTransactions = (int) $transactions->count();
        $totalConsumed = (int) $usageByItem->sum('consumed');
        $totalCost = round((float) $usageByItem->sum('cost'), 2);

        return [
            'date_range' => [
                'start_date' => $rangeStart->toDateString(),
                'end_date' => $rangeEnd->toDateString(),
            ],
            'summary' => [
                'total_transactions' => $totalTransactions,
                'total_consumed' => $totalConsumed,
                'total_cost' => $totalCost,
                'unique_items_used' => $usageByItem->count(),
                'most_used_item' => $mostUsedItem ? [
                    'part_number' => $mostUsedItem['part_number'],
                    'item_name' => $mostUsedItem['item_name'],
                    'consumed' => $mostUsedItem['consumed'],
                ] : null,
                'active_categories' => $categoryBreakdown->count(),
            ],
            'usage_by_item' => $usageByItem,
            'category_breakdown' => $categoryBreakdown,
            'top_consumed_items' => $topConsumedItems,
            'daily_summary' => $dailySummary,

            // Compatibility keys for legacy consumers.
            'period' => [
                'start_date' => $rangeStart->toDateString(),
                'end_date' => $rangeEnd->toDateString(),
                'days' => $rangeStart->diffInDays($rangeEnd) + 1,
            ],
            'total_transactions' => $totalTransactions,
            'by_type' => $byType,
            'top_items' => $topConsumedItems,
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function getProcurementAnalytics(Carbon $startDate, Carbon $endDate): array
    {
        $rangeStart = $startDate->copy()->startOfDay();
        $rangeEnd = $endDate->copy()->endOfDay();
        $transactions = $this->transactionRepository->getByDateRange($rangeStart, $rangeEnd)
            ->where('transaction_type', 'procurement');

        $bySupplier = $transactions
            ->groupBy(fn (StockTransaction $transaction) => $transaction->inventory->supplier ?? 'Unknown')
            ->map(function ($group, $supplier) {
                $quantity = (int) $group->sum('quantity');
                $value = round((float) $group->sum(fn (StockTransaction $transaction) => (int) $transaction->quantity * (float) ($transaction->inventory->unit_price ?? 0)), 2);

                return [
                    'supplier' => (string) $supplier,
                    'count' => (int) $group->count(),
                    'quantity' => $quantity,
                    'value' => $value,
                    'items_count' => (int) $group->pluck('item_id')->unique()->count(),
                ];
            })
            ->sortByDesc('value')
            ->values();

        $byCategory = $transactions
            ->groupBy(fn (StockTransaction $transaction) => $transaction->inventory->category ?? 'Unknown')
            ->map(function ($group, $category) {
                $quantity = (int) $group->sum('quantity');
                $value = round((float) $group->sum(fn (StockTransaction $transaction) => (int) $transaction->quantity * (float) ($transaction->inventory->unit_price ?? 0)), 2);

                return [
                    'category' => (string) $category,
                    'count' => (int) $group->count(),
                    'quantity' => $quantity,
                    'value' => $value,
                    'item_count' => (int) $group->pluck('item_id')->unique()->count(),
                ];
            })
            ->sortByDesc('value')
            ->values();

        $monthlyBreakdown = $transactions
            ->groupBy(fn (StockTransaction $transaction) => $transaction->created_at->format('Y-m'))
            ->map(function ($group, $monthKey) {
                $monthDate = Carbon::createFromFormat('Y-m', (string) $monthKey);
                $quantity = (int) $group->sum('quantity');
                $value = round((float) $group->sum(fn (StockTransaction $transaction) => (int) $transaction->quantity * (float) ($transaction->inventory->unit_price ?? 0)), 2);

                return [
                    'month' => $monthDate->format('M Y'),
                    'quantity' => $quantity,
                    'value' => $value,
                ];
            })
            ->sortBy(fn ($row) => Carbon::createFromFormat('M Y', (string) $row['month'])->timestamp)
            ->values();

        $totalProcurements = (int) $transactions->count();
        $totalQuantity = (int) $transactions->sum('quantity');
        $totalValue = round((float) $transactions->sum(fn ($t) => (int) $t->quantity * (float) ($t->inventory->unit_price ?? 0)), 2);

        return [
            'date_range' => [
                'start_date' => $rangeStart->toDateString(),
                'end_date' => $rangeEnd->toDateString(),
            ],
            'total_procurements' => $totalProcurements,
            'total_procured' => $totalQuantity,
            'total_quantity' => $totalQuantity,
            'total_value' => $totalValue,
            'by_supplier' => $bySupplier,
            'by_category' => $byCategory,
            'monthly_breakdown' => $monthlyBreakdown,

            // Compatibility key used by legacy consumers.
            'period' => [
                'start_date' => $rangeStart->toDateString(),
                'end_date' => $rangeEnd->toDateString(),
            ],
        ];
    }
}
