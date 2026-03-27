<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Inventory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Interface for Inventory Repository operations.
 *
 * Defines the contract for inventory data access including CRUD operations,
 * filtering, and stock-related queries.
 */
interface InventoryRepositoryInterface
{
    /**
     * Find an inventory item by its ID.
     *
     * @param int $itemId The unique identifier for the inventory item
     */
    public function findById(int|string $itemId): ?Inventory;

    /**
     * Find an inventory item by ID or throw an exception.
     *
     * @param int $itemId The unique identifier for the inventory item
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function findByIdOrFail(int|string $itemId): Inventory;

    /**
     * Find an inventory item by ID with a database lock for update.
     *
     * @param int $itemId The unique identifier for the inventory item
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function findByIdWithLock(int|string $itemId): Inventory;

    /**
     * Get paginated inventory items with optional filters.
     *
     * @param array{
     *     category?: string,
     *     status?: string,
     *     low_stock?: bool,
     *     search?: string
     * } $filters Optional filters to apply
     * @param int $perPage Number of items per page
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Create a new inventory item.
     *
     * @param array<string, mixed> $data The inventory item data
     */
    public function create(array $data): Inventory;

    /**
     * Update an existing inventory item.
     *
     * @param int $itemId The unique identifier for the inventory item
     * @param array<string, mixed> $data The data to update
     */
    public function update(int|string $itemId, array $data): Inventory;

    /**
     * Delete an inventory item (soft delete by setting status to discontinued).
     *
     * @param int $itemId The unique identifier for the inventory item
     */
    public function delete(int|string $itemId): bool;

    /**
     * Get all items with stock below their reorder level.
     */
    public function getLowStockItems(): Collection;

    /**
     * Get all active inventory items.
     */
    public function getActiveItems(): Collection;

    /**
     * Get inventory breakdown by category.
     *
     * @return Collection<int, object{category: string, count: int, total_value: float}>
     */
    public function getCategoryBreakdown(): Collection;

    /**
     * Get top value items by total inventory value.
     *
     * @param int $limit Maximum number of items to return
     */
    public function getTopValueItems(int $limit = 10): Collection;

    /**
     * Get the total value of all inventory.
     */
    public function getTotalInventoryValue(): float;

    /**
     * Get count of items with zero stock.
     */
    public function getOutOfStockCount(): int;
}
