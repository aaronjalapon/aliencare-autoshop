<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface VehicleRepositoryInterface
{
    public function findById(int|string $id): ?Vehicle;

    public function findByIdOrFail(int|string $id): Vehicle;

    /**
     * @param  array<string, mixed>  $filters
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Vehicle;

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(int|string $id, array $data): Vehicle;

    /**
     * @return Collection<int, Vehicle>
     */
    public function getByCustomer(int $customerId): Collection;

    public function approveVehicle(int $vehicleId, int $approvedBy): Vehicle;

    public function rejectVehicle(int $vehicleId): void;

    public function deleteVehicle(int $vehicleId): void;
}
