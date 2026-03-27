<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Exceptions\InsufficientStockException;
use App\Exceptions\InventoryNotFoundException;
use App\Models\Inventory;
use App\Models\StockTransaction;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Interface for Inventory Service operations.
 *
 * Defines the contract for inventory management including stock checking,
 * adjustments, analytics, and demand forecasting.
 */
interface InventoryServiceInterface
{
    /**
     * Check stock levels and return detailed status for an item.
     *
     * @param  int|string  $itemId  The unique identifier for the inventory item
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
    public function checkStockStatus(int|string $itemId, int $requestedQuantity = 1): array;

    /**
     * Process stock adjustment with full transaction logging.
     *
     * @param  int|string  $itemId  The unique identifier for the inventory item
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
        int|string $itemId,
        int $quantity,
        string $transactionType,
        ?string $referenceNumber = null,
        ?string $notes = null,
        string $createdBy = 'System'
    ): array;

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
    public function getInventorySummary(): array;

    /**
     * Generate comprehensive usage analytics for a date range.
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
    public function getUsageAnalytics(Carbon $startDate, Carbon $endDate): array;

    /**
     * Forecast demand for an item based on historical data.
     *
     * @param  int|string  $itemId  The unique identifier for the inventory item
     * @param  int  $forecastDays  Number of days to forecast (default: 30)
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
    public function forecastDemand(int|string $itemId, int $forecastDays = 30): array;
}
