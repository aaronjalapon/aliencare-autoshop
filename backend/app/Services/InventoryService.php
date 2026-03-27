<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Services\InventoryServiceInterface;
use App\Events\LowStockAlert;
use App\Events\StockUpdated;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InventoryNotFoundException;
use App\Models\Inventory;
use App\Models\Reservation;
use App\Models\StockTransaction;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Service class for inventory management operations.
 *
 * Handles stock checking, adjustments, analytics, and demand forecasting
 * for the inventory management system.
 */
class InventoryService implements InventoryServiceInterface
{
    /**
     * Check stock levels and return status.
     *
     * @param  string  $itemId  The unique identifier for the inventory item
     * @param  int  $requestedQuantity  The quantity being requested (default: 1)
     * @return array{
     *     item_id: string,
     *     item_name: string,
     *     current_stock: int,
     *     available_stock: int,
     *     reserved_stock: int,
     *     requested_quantity: int,
     *     status: string,
     *     is_low_stock: bool,
     *     reorder_level: int,
     *     supplier: string|null,
     *     unit_price: float
     * }
     *
     * @throws InventoryNotFoundException When item does not exist
     */
    public function checkStockStatus(string $itemId, int $requestedQuantity = 1): array
    {
        $this->validateItemId($itemId);

        $inventory = Inventory::where('item_id', $itemId)->first();

        if (! $inventory) {
            throw new InventoryNotFoundException($itemId);
        }

        $availableStock = $inventory->available_stock;
        $status = $inventory->getStockStatus($requestedQuantity);

        return [
            'item_id' => $inventory->item_id,
            'item_name' => $inventory->item_name,
            'current_stock' => $inventory->stock,
            'available_stock' => $availableStock,
            'reserved_stock' => $inventory->stock - $availableStock,
            'requested_quantity' => $requestedQuantity,
            'status' => $status,
            'is_low_stock' => $inventory->isLowStock(),
            'reorder_level' => $inventory->reorder_level,
            'supplier' => $inventory->supplier,
            'unit_price' => $inventory->unit_price,
        ];
    }

    /**
     * Process stock adjustment with full transaction logging.
     *
     * @param  string  $itemId  The unique identifier for the inventory item
     * @param  int  $quantity  Positive for stock increase, negative for decrease
     * @param  string  $transactionType  Type of transaction (sale, procurement, etc.)
     * @param  string|null  $referenceNumber  Optional reference number for tracking
     * @param  string|null  $notes  Optional notes about the transaction
     * @param  string  $createdBy  Identity of who created the transaction
     * @return array{
     *     inventory: Inventory,
     *     transaction: StockTransaction,
     *     previous_stock: int,
     *     new_stock: int,
     *     quantity_changed: int
     * }
     *
     * @throws InventoryNotFoundException When item does not exist
     * @throws InsufficientStockException When stock is insufficient for deduction
     */
    public function adjustStock(
        string $itemId,
        int $quantity,
        string $transactionType,
        ?string $referenceNumber = null,
        ?string $notes = null,
        string $createdBy = 'System'
    ): array {
        $this->validateItemId($itemId);
        $this->validateQuantity($quantity);
        $this->validateTransactionType($transactionType);

        return DB::transaction(function () use ($itemId, $quantity, $transactionType, $referenceNumber, $notes, $createdBy) {
            $inventory = Inventory::where('item_id', $itemId)->lockForUpdate()->first();

            if (! $inventory) {
                throw new InventoryNotFoundException($itemId);
            }

            // Validate stock levels for outgoing transactions
            if ($quantity < 0 && $inventory->stock < abs($quantity)) {
                throw new InsufficientStockException(
                    $itemId,
                    $inventory->stock,
                    abs($quantity)
                );
            }

            $previousStock = $inventory->stock;
            $newStock = $previousStock + $quantity;

            // Update inventory
            $inventory->update(['stock' => $newStock]);

            // Log transaction
            $transaction = StockTransaction::create([
                'item_id' => $itemId,
                'transaction_type' => $transactionType,
                'quantity' => $quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'reference_number' => $referenceNumber,
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            // Fire events
            event(new StockUpdated($inventory, $transactionType));

            // Check for low stock alerts using config values
            $alertTriggeringTypes = config('inventory.alert_triggering_transactions', ['sale', 'damage', 'reservation']);
            if ($inventory->isLowStock() && in_array($transactionType, $alertTriggeringTypes, true)) {
                event(new LowStockAlert($inventory));
            }

            return [
                'inventory' => $inventory->fresh(),
                'transaction' => $transaction,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'quantity_changed' => $quantity,
            ];
        });
    }

    /**
     * Get inventory summary with key metrics.
     *
     * @return array{
     *     overview: array{
     *         total_items: int,
     *         total_inventory_value: float,
     *         low_stock_items: int,
     *         out_of_stock_items: int,
     *         stock_accuracy: float
     *     },
     *     category_breakdown: Collection,
     *     top_value_items: Collection,
     *     alerts: array{
     *         critical_items: int,
     *         low_stock_items: int,
     *         pending_reservations: int
     *     }
     * }
     */
    public function getInventorySummary(): array
    {
        $totalItems = Inventory::active()->count();

        // Using DB::raw for aggregation - necessary for calculated columns
        $totalValue = Inventory::active()->sum(DB::raw('stock * unit_price'));
        $lowStockItems = Inventory::lowStock()->active()->count();
        $outOfStockItems = Inventory::where('stock', 0)->active()->count();

        $categoryBreakdown = $this->getCategoryBreakdown();
        $topValueItems = $this->getTopValueItems();

        return [
            'overview' => [
                'total_items' => $totalItems,
                'total_inventory_value' => (float) $totalValue,
                'low_stock_items' => $lowStockItems,
                'out_of_stock_items' => $outOfStockItems,
                'stock_accuracy' => $this->calculateStockAccuracy(),
            ],
            'category_breakdown' => $categoryBreakdown,
            'top_value_items' => $topValueItems,
            'alerts' => [
                'critical_items' => Inventory::where('stock', 0)->active()->count(),
                'low_stock_items' => $lowStockItems,
                'pending_reservations' => Reservation::pending()->count(),
            ],
        ];
    }

    /**
     * Generate comprehensive usage analytics.
     *
     * @param  Carbon  $startDate  Start date of the analysis period
     * @param  Carbon  $endDate  End date of the analysis period
     * @return array{
     *     period: array{start_date: string, end_date: string, days: int},
     *     transaction_summary: Collection,
     *     top_moving_items: Collection,
     *     category_performance: Collection,
     *     daily_summary: array
     * }
     */
    public function getUsageAnalytics(Carbon $startDate, Carbon $endDate): array
    {
        $transactions = StockTransaction::whereBetween('created_at', [$startDate, $endDate])
            ->with('inventory')
            ->get();

        $transactionSummary = $this->summarizeTransactionsByType($transactions);
        $itemMovement = $this->calculateItemMovement($transactions);
        $categoryPerformance = $this->calculateCategoryPerformance($transactions);

        return [
            'period' => [
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'days' => $startDate->diffInDays($endDate) + 1,
            ],
            'transaction_summary' => $transactionSummary,
            'top_moving_items' => $itemMovement->values(),
            'category_performance' => $categoryPerformance->values(),
            'daily_summary' => $this->getDailySummary($startDate, $endDate),
        ];
    }

    /**
     * Forecast demand for an item based on historical data.
     *
     * @param  string  $itemId  The unique identifier for the inventory item
     * @param  int  $forecastDays  Number of days to forecast (default: from config)
     * @return array{
     *     item_id: string,
     *     item_name: string,
     *     current_stock: int,
     *     available_stock: int,
     *     forecast_period_days: int,
     *     historical_daily_average: float,
     *     predicted_demand: int,
     *     confidence_level: int,
     *     recommendation: string,
     *     reorder_suggestion: string,
     *     reorder_level: int,
     *     historical_transactions: int
     * }
     *
     * @throws InventoryNotFoundException When item does not exist
     */
    public function forecastDemand(string $itemId, int $forecastDays = 0): array
    {
        $this->validateItemId($itemId);

        // Use config default if not specified
        if ($forecastDays <= 0) {
            $forecastDays = config('inventory.default_forecast_period', 30);
        }

        $inventory = Inventory::where('item_id', $itemId)->first();

        if (! $inventory) {
            throw new InventoryNotFoundException($itemId);
        }

        $historicalDays = config('inventory.forecast_historical_days', 90);

        // Get historical sales data
        $historicalSales = StockTransaction::where('item_id', $itemId)
            ->where('transaction_type', 'sale')
            ->where('created_at', '>=', now()->subDays($historicalDays))
            ->get();

        if ($historicalSales->isEmpty()) {
            return $this->buildNoDataForecastResponse($itemId, $inventory, $forecastDays);
        }

        return $this->buildForecastResponse($itemId, $inventory, $historicalSales, $forecastDays, $historicalDays);
    }

    /**
     * Validate that the item ID is not empty.
     *
     * @throws \InvalidArgumentException
     */
    private function validateItemId(string $itemId): void
    {
        if (empty(trim($itemId))) {
            throw new \InvalidArgumentException('Item ID cannot be empty');
        }
    }

    /**
     * Validate that the quantity is not zero.
     *
     * @throws \InvalidArgumentException
     */
    private function validateQuantity(int $quantity): void
    {
        if ($quantity === 0) {
            throw new \InvalidArgumentException('Quantity cannot be zero');
        }
    }

    /**
     * Validate that the transaction type is valid.
     *
     * @throws \InvalidArgumentException
     */
    private function validateTransactionType(string $transactionType): void
    {
        $validTypes = config('inventory.transaction_types', [
            'sale', 'procurement', 'reservation', 'return', 'damage', 'adjustment_in', 'adjustment_out',
        ]);

        if (! in_array($transactionType, $validTypes, true)) {
            throw new \InvalidArgumentException("Invalid transaction type: {$transactionType}");
        }
    }

    /**
     * Get category breakdown for inventory summary.
     *
     * Uses DB::raw for aggregate calculations on computed columns.
     */
    private function getCategoryBreakdown(): Collection
    {
        return Inventory::active()
            ->select('category', DB::raw('COUNT(*) as item_count'), DB::raw('SUM(stock * unit_price) as total_value'))
            ->groupBy('category')
            ->orderBy('total_value', 'desc')
            ->get();
    }

    /**
     * Get top value items for inventory summary.
     *
     * Uses DB::raw to calculate total value per item.
     */
    private function getTopValueItems(): Collection
    {
        $limit = config('inventory.top_items_limit', 10);

        return Inventory::active()
            ->select('item_id', 'item_name', 'category', 'stock', 'unit_price', DB::raw('stock * unit_price as total_value'))
            ->orderBy('total_value', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Calculate stock accuracy percentage.
     *
     * This is a simplified calculation. In a production system,
     * you would compare against cycle count data.
     */
    private function calculateStockAccuracy(): float
    {
        $totalItems = Inventory::active()->count();
        $accurateItems = $totalItems; // Assuming all are accurate for now

        return $totalItems > 0 ? ($accurateItems / $totalItems) * 100 : 100.0;
    }

    /**
     * Summarize transactions by type for analytics.
     */
    private function summarizeTransactionsByType(Collection $transactions): Collection
    {
        return $transactions->groupBy('transaction_type')->map(function ($typeTransactions, $type) {
            $totalQuantity = $typeTransactions->sum(fn ($t) => abs($t->quantity));
            $totalValue = $typeTransactions->sum(fn ($t) => abs($t->quantity) * $t->inventory->unit_price);

            return [
                'transaction_count' => $typeTransactions->count(),
                'total_quantity' => $totalQuantity,
                'total_value' => $totalValue,
                'average_transaction_value' => $typeTransactions->count() > 0 ? $totalValue / $typeTransactions->count() : 0,
            ];
        });
    }

    /**
     * Calculate item movement statistics.
     */
    private function calculateItemMovement(Collection $transactions): Collection
    {
        $limit = config('inventory.top_moving_items_limit', 20);

        return $transactions->groupBy('item_id')->map(function ($itemTransactions, $itemId) {
            $item = $itemTransactions->first()->inventory;
            $totalOut = $itemTransactions->where('quantity', '<', 0)->sum(fn ($t) => abs($t->quantity));
            $totalIn = $itemTransactions->where('quantity', '>', 0)->sum('quantity');

            return [
                'item_id' => $itemId,
                'item_name' => $item->item_name,
                'category' => $item->category,
                'total_in' => $totalIn,
                'total_out' => $totalOut,
                'net_movement' => $totalIn - $totalOut,
                'turnover_rate' => $item->stock > 0 ? $totalOut / $item->stock : 0,
                'transaction_count' => $itemTransactions->count(),
            ];
        })->sortByDesc('total_out')->take($limit);
    }

    /**
     * Calculate category performance statistics.
     */
    private function calculateCategoryPerformance(Collection $transactions): Collection
    {
        return $transactions->groupBy('inventory.category')->map(function ($categoryTransactions, $category) {
            $outgoingTransactions = $categoryTransactions->where('quantity', '<', 0);
            $totalOut = $outgoingTransactions->sum(fn ($t) => abs($t->quantity));
            $totalValue = $outgoingTransactions->sum(fn ($t) => abs($t->quantity) * $t->inventory->unit_price);

            return [
                'category' => $category,
                'items_sold' => $totalOut,
                'revenue' => $totalValue,
                'transaction_count' => $outgoingTransactions->count(),
                'average_transaction_value' => $outgoingTransactions->count() > 0 ? $totalValue / $outgoingTransactions->count() : 0,
            ];
        })->sortByDesc('revenue');
    }

    /**
     * Get daily transaction summary for a date range.
     */
    private function getDailySummary(Carbon $startDate, Carbon $endDate): array
    {
        $dailyData = [];
        $currentDate = $startDate->copy();

        while ($currentDate <= $endDate) {
            $dayTransactions = StockTransaction::whereDate('created_at', $currentDate)
                ->with('inventory')
                ->get();

            $sales = $dayTransactions->where('transaction_type', 'sale');
            $procurement = $dayTransactions->where('transaction_type', 'procurement');

            $dailyData[] = [
                'date' => $currentDate->format('Y-m-d'),
                'sales_count' => $sales->count(),
                'sales_value' => $sales->sum(fn ($t) => abs($t->quantity) * $t->inventory->unit_price),
                'procurement_count' => $procurement->count(),
                'procurement_value' => $procurement->sum(fn ($t) => $t->quantity * $t->inventory->unit_price),
                'total_transactions' => $dayTransactions->count(),
            ];

            $currentDate->addDay();
        }

        return $dailyData;
    }

    /**
     * Build forecast response when no historical data is available.
     */
    private function buildNoDataForecastResponse(string $itemId, Inventory $inventory, int $forecastDays): array
    {
        return [
            'item_id' => $itemId,
            'item_name' => $inventory->item_name,
            'current_stock' => $inventory->stock,
            'available_stock' => $inventory->available_stock,
            'forecast_period_days' => $forecastDays,
            'historical_daily_average' => 0.0,
            'predicted_demand' => 0,
            'confidence_level' => 0,
            'recommendation' => 'No historical data available',
            'reorder_suggestion' => 'Monitor for initial sales pattern',
            'reorder_level' => $inventory->reorder_level,
            'historical_transactions' => 0,
        ];
    }

    /**
     * Build forecast response with calculated predictions.
     */
    private function buildForecastResponse(
        string $itemId,
        Inventory $inventory,
        Collection $historicalSales,
        int $forecastDays,
        int $historicalDays
    ): array {
        // Simple moving average calculation
        $totalSold = $historicalSales->sum(fn ($t) => abs($t->quantity));
        $dailyAverage = $totalSold / $historicalDays;
        $predictedDemand = $dailyAverage * $forecastDays;

        // Calculate confidence based on data consistency
        $confidenceDivisor = config('inventory.forecast_confidence_divisor', 30);
        $confidenceLevel = min(100, ($historicalSales->count() / $confidenceDivisor) * 100);

        // Generate recommendation
        $currentStock = $inventory->stock;
        $availableStock = $inventory->available_stock;

        $recommendation = 'Monitor stock levels';
        $reorderSuggestion = 'Maintain current levels';

        if ($predictedDemand > $availableStock) {
            $shortfall = $predictedDemand - $availableStock;
            $recommendation = "Reorder recommended: {$shortfall} units needed";

            $bufferMultiplier = config('inventory.reorder_buffer_multiplier', 1.2);
            $reorderSuggestion = 'Order '.ceil($shortfall * $bufferMultiplier).' units ('.(($bufferMultiplier - 1) * 100).'% buffer)';
        }

        return [
            'item_id' => $itemId,
            'item_name' => $inventory->item_name,
            'current_stock' => $currentStock,
            'available_stock' => $availableStock,
            'forecast_period_days' => $forecastDays,
            'historical_daily_average' => round($dailyAverage, 2),
            'predicted_demand' => (int) round($predictedDemand),
            'confidence_level' => (int) round($confidenceLevel),
            'recommendation' => $recommendation,
            'reorder_suggestion' => $reorderSuggestion,
            'reorder_level' => $inventory->reorder_level,
            'historical_transactions' => $historicalSales->count(),
        ];
    }
}
