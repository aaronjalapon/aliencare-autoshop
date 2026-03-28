<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Contracts\Repositories\VehicleRepositoryInterface;
use App\Models\Vehicle;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class VehicleRepository extends BaseRepository implements VehicleRepositoryInterface
{
    public function __construct(Vehicle $model)
    {
        parent::__construct($model);
    }

    public function findById(int|string $id): ?Vehicle
    {
        return $this->model->with('customer')->find($id);
    }

    public function findByIdOrFail(int|string $id): Vehicle
    {
        return $this->model->with('customer')->findOrFail($id);
    }

    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery()->with('customer');

        if (isset($filters['customer_id'])) {
            $query->where('customer_id', $filters['customer_id']);
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('plate_number', 'like', "%{$search}%")
                    ->orWhere('make', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function create(array $data): Vehicle
    {
        return $this->model->create($data);
    }

    public function update(int|string $id, array $data): Vehicle
    {
        $record = $this->model->findOrFail($id);
        $record->update($data);

        return $record->fresh('customer');
    }
}
