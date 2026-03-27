<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\ReservationRepositoryInterface;
use App\Models\Reservation;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Eloquent implementation of the Reservation Repository.
 */
class ReservationRepository extends BaseRepository implements ReservationRepositoryInterface
{
    /**
     * Create a new reservation repository instance.
     */
    public function __construct(Reservation $model)
    {
        parent::__construct($model);
    }

    /**
     * {@inheritDoc}
     */
    public function findById(int|string $id): ?Reservation
    {
        return $this->model->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByIdOrFail(int|string $id): Reservation
    {
        return $this->model->findOrFail($id);
    }

    /**
     * {@inheritDoc}
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->with('inventory');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['item_id'])) {
            $query->where('item_id', $filters['item_id']);
        }

        if (isset($filters['job_order_number'])) {
            $query->where('job_order_number', 'like', "%{$filters['job_order_number']}%");
        }

        if (isset($filters['start_date'])) {
            $query->whereDate('requested_date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('requested_date', '<=', $filters['end_date']);
        }

        return $query->orderBy('priority_level', 'asc')
            ->orderBy('requested_date', 'desc')
            ->paginate($perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Reservation
    {
        return $this->model->create($data);
    }

    /**
     * {@inheritDoc}
     */
    public function update(int|string $id, array $data): Reservation
    {
        $reservation = $this->findByIdOrFail($id);
        $reservation->update($data);

        return $reservation->fresh();
    }

    /**
     * {@inheritDoc}
     */
    public function getActiveReservations(): Collection
    {
        return $this->model
            ->whereIn('status', ['pending', 'approved'])
            ->with('inventory')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getPendingCount(): int
    {
        return $this->model->where('status', 'pending')->count();
    }

    /**
     * {@inheritDoc}
     */
    public function getApprovedCount(): int
    {
        return $this->model->where('status', 'approved')->count();
    }

    /**
     * {@inheritDoc}
     */
    public function getExpiringSoon(int $days = 3): Collection
    {
        return $this->model
            ->where('status', 'approved')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now()->addDays($days))
            ->where('expires_at', '>', now())
            ->with('inventory')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getByJobOrder(string $jobOrderNumber): Collection
    {
        return $this->model
            ->where('job_order_number', $jobOrderNumber)
            ->with('inventory')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getByStatus(string $status): Collection
    {
        return $this->model
            ->where('status', $status)
            ->with('inventory')
            ->get();
    }

    /**
     * {@inheritDoc}
     */
    public function getReservedQuantityForItem(int $itemId): int
    {
        return (int) $this->model
            ->where('item_id', $itemId)
            ->whereIn('status', ['pending', 'approved'])
            ->sum('quantity');
    }
}
