<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\InventoryRepositoryInterface;
use App\Models\Inventory;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Eloquent implementation of the Inventory Repository.
 */
class InventoryRepository extends BaseRepository implements InventoryRepositoryInterface
{
    /**
     * Create a new inventory repository instance.
     */
    public function __construct(Inventory $model)
    {
        parent::__construct($model);
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int|string $itemId): ?Inventory
    {
        return $this->model->find($itemId);
    }

    /**
     * {@inheritDoc}
     */
    public function findByIdOrFail(int|string $itemId): Inventory
    {
        return $this->model->findOrFail($itemId);
    }

    /**
     * {@inheritDoc}
     */
    public function findByIdWithLock(int|string $itemId): Inventory
    {
        return $this->model->lockForUpdate()->findOrFail($itemId);
    }

    /**
     * {@inheritDoc}
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['low_stock']) && $filters['low_stock']) {
            $query->whereColumn('stock', '<=', 'reorder_level');
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('item_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('supplier', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Inventory
    {
        return $this->model->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(int|string $itemId, array $data): Inventory
    {
        $inventory = $this->findByIdOrFail($itemId);
        $inventory->update($data);

        return $inventory->fresh();
    }

    /**
     * {@inheritDoc}
     */
    public function delete(int|string $itemId): bool
    {
        $inventory = $this->findByIdOrFail($itemId);
        $inventory->update(['status' => 'discontinued']);

        return true;
    }

    /**
     * {@inheritDoc}
     */
    public function getLowStockItems(): Collection
    {
        return $this->model
            ->where('status', 'active')
            ->whereColumn('stock', '<=', 'reorder_level')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getActiveItems(): Collection
    {
        return $this->model->where('status', 'active')->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getCategoryBreakdown(): Collection
    {
        return $this->model
            ->where('status', 'active')
            ->selectRaw('category, COUNT(*) as count, SUM(stock * unit_price) as total_value')
            ->groupBy('category')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getTopValueItems(int $limit = 10): Collection
    {
        return $this->model
            ->where('status', 'active')
            ->selectRaw('*, (stock * unit_price) as total_value')
            ->orderByRaw('stock * unit_price DESC')
            ->limit($limit)
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getTotalInventoryValue(): float
    {
        return (float) $this->model
            ->where('status', 'active')
            ->selectRaw('SUM(stock * unit_price) as total')
            ->value('total') ?? 0.0;
    }

    /**
     * {@inheritDoc}
     */
    public function getOutOfStockCount(): int
    {
        return $this->model
            ->where('status', 'active')
            ->where('stock', 0)
            ->count();
    }
}
