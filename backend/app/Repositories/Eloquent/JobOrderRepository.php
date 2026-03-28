<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\JobOrderRepositoryInterface;
use App\Models\JobOrder;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class JobOrderRepository extends BaseRepository implements JobOrderRepositoryInterface
{
    public function __construct(JobOrder $model)
    {
        parent::__construct($model);
    }

    public function findById(int|string $id): ?JobOrder
    {
        return $this->model->with(['customer', 'vehicle', 'mechanic.user', 'bay', 'items'])->find($id);
    }

    public function findByIdOrFail(int|string $id): JobOrder
    {
        return $this->model->with(['customer', 'vehicle', 'mechanic.user', 'bay', 'items'])->findOrFail($id);
    }

    public function findByJoNumber(string $joNumber): ?JobOrder
    {
        return $this->model->with(['customer', 'vehicle', 'mechanic.user', 'bay', 'items'])
            ->where('jo_number', $joNumber)
            ->first();
    }

    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery()->with(['customer', 'vehicle', 'mechanic.user', 'bay']);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['customer_id'])) {
            $query->where('customer_id', $filters['customer_id']);
        }

        if (isset($filters['mechanic_id'])) {
            $query->where('assigned_mechanic_id', $filters['mechanic_id']);
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('jo_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        if (isset($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function create(array $data): JobOrder
    {
        return $this->model->create($data);
    }

    public function update(int|string $id, array $data): JobOrder
    {
        $record = $this->model->findOrFail($id);
        $record->update($data);

        return $record->fresh(['customer', 'vehicle', 'mechanic.user', 'bay', 'items']);
    }

    public function delete(int|string $id): bool
    {
        return (bool) $this->model->findOrFail($id)->delete();
    }
}
