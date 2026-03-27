<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\StockTransaction;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * Interface for Stock Transaction Repository operations.
 *
 * Defines the contract for stock transaction data access including
 * CRUD operations, filtering, and analytics queries.
 */
interface StockTransactionRepositoryInterface
{
    /**
     * Find a transaction by its ID.
     *
     * @param  int  $id  The unique identifier for the transaction
     */
    public function findById(int|string $id): ?StockTransaction;

    /**
     * Find a transaction by ID or throw an exception.
     *
     * @param  int  $id  The unique identifier for the transaction
     *
     * @throws ModelNotFoundException
     */
    public function findByIdOrFail(int|string $id): StockTransaction;

    /**
     * Get paginated transactions with optional filters.
     *
     * @param array{
     *     item_id?: int,
     *     transaction_type?: string,
     *     start_date?: string,
     *     end_date?: string,
     *     created_by?: string
     * } $filters Optional filters to apply
     * @param  int  $perPage  Number of items per page
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Create a new stock transaction.
     *
     * @param  array<string, mixed>  $data  The transaction data
     */
    public function create(array $data): StockTransaction;

    /**
     * Get transactions within a date range.
     *
     * @param  Carbon  $startDate  Start of the date range
     * @param  Carbon  $endDate  End of the date range
     */
    public function getByDateRange(Carbon $startDate, Carbon $endDate): Collection;

    /**
     * Get all transactions for a specific inventory item.
     *
     * @param  int  $itemId  The inventory item ID
     */
    public function getByItemId(int $itemId): Collection;

    /**
     * Get transactions by type.
     *
     * @param  string  $type  The transaction type
     */
    public function getByType(string $type): Collection;

    /**
     * Get historical sales transactions for an item within a specified period.
     *
     * @param  int  $itemId  The inventory item ID
     * @param  int  $days  Number of days to look back
     */
    public function getHistoricalSales(int $itemId, int $days): Collection;

    /**
     * Get transaction summary grouped by type for a date range.
     *
     * @param  Carbon  $startDate  Start of the date range
     * @param  Carbon  $endDate  End of the date range
     * @return Collection<int, object{type: string, count: int, total_quantity: int}>
     */
    public function getSummaryByType(Carbon $startDate, Carbon $endDate): Collection;
}
