<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\StockTransactionRepositoryInterface;
use App\Models\StockTransaction;
use App\Repositories\BaseRepository;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Eloquent implementation of the Stock Transaction Repository.
 */
class StockTransactionRepository extends BaseRepository implements StockTransactionRepositoryInterface
{
    /**
     * Create a new stock transaction repository instance.
     */
    public function __construct(StockTransaction $model)
    {
        parent::__construct($model);
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int|string $id): ?StockTransaction
    {
        return $this->model->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByIdOrFail(int|string $id): StockTransaction
    {
        return $this->model->findOrFail($id);
    }

    /**
     * {@inheritDoc}
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->with('inventory');

        if (isset($filters['item_id'])) {
            $query->where('item_id', $filters['item_id']);
        }

        if (isset($filters['transaction_type'])) {
            $query->where('transaction_type', $filters['transaction_type']);
        }

        if (isset($filters['start_date'])) {
            $query->whereDate('created_at', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('created_at', '<=', $filters['end_date']);
        }

        if (isset($filters['created_by'])) {
            $query->where('created_by', $filters['created_by']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): StockTransaction
    {
        return $this->model->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function getByDateRange(Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->model
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with('inventory')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getByItemId(int $itemId): Collection
    {
        return $this->model
            ->where('item_id', $itemId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getByType(string $type): Collection
    {
        return $this->model
            ->where('transaction_type', $type)
            ->with('inventory')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getHistoricalSales(int $itemId, int $days): Collection
    {
        return $this->model
            ->where('item_id', $itemId)
            ->where('transaction_type', 'sale')
            ->where('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getSummaryByType(Carbon $startDate, Carbon $endDate): Collection
    {
        return $this->model
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('transaction_type as type, COUNT(*) as count, SUM(ABS(quantity)) as total_quantity')
            ->groupBy('transaction_type')
            ->get();
    }
}
