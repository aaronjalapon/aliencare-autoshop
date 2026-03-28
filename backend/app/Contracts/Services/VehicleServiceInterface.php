<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Collection;

interface VehicleServiceInterface
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function addVehicle(int $customerId, array $data, int $userId, ?string $ip = null): Vehicle;

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateVehicle(int $vehicleId, array $data, int $userId, ?string $ip = null): Vehicle;

    public function approveVehicle(int $vehicleId, int $approvedBy, ?string $ip = null): Vehicle;

    public function rejectVehicle(int $vehicleId, int $rejectedBy, ?string $ip = null): void;

    public function deleteVehicle(int $vehicleId, int $userId, ?string $ip = null): void;

    /**
     * @return Collection<int, Vehicle>
     */
    public function getCustomerVehicles(int $customerId): Collection;
}
