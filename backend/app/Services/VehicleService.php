<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Contracts\Repositories\VehicleRepositoryInterface;
use App\Contracts\Services\VehicleServiceInterface;
use App\Enums\VehicleApprovalStatus;
use App\Events\VehicleApprovalRequested;
use App\Models\CustomerAuditLog;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class VehicleService implements VehicleServiceInterface
{
    public function __construct(
        private VehicleRepositoryInterface $vehicleRepository,
        private CustomerRepositoryInterface $customerRepository,
    ) {}

    public function addVehicle(int $customerId, array $data, int $userId, ?string $ip = null): Vehicle
    {
        return DB::transaction(function () use ($customerId, $data, $userId, $ip) {
            $this->customerRepository->findByIdOrFail($customerId);

            $data['customer_id'] = $customerId;
            $data['approval_status'] = VehicleApprovalStatus::Pending->value;

            $vehicle = $this->vehicleRepository->create($data);

            $this->logAudit($customerId, $userId, 'create', 'vehicle', null, $vehicle->toArray(), $ip);

            event(new VehicleApprovalRequested($vehicle));

            return $vehicle->load('customer');
        });
    }

    public function updateVehicle(int $vehicleId, array $data, int $userId, ?string $ip = null): Vehicle
    {
        return DB::transaction(function () use ($vehicleId, $data, $userId, $ip) {
            $vehicle = $this->vehicleRepository->findByIdOrFail($vehicleId);
            $oldData = $vehicle->only(array_keys($data));

            $data['approval_status'] = VehicleApprovalStatus::Pending->value;
            $vehicle = $this->vehicleRepository->update($vehicleId, $data);

            $this->logAudit(
                $vehicle->customer_id,
                $userId,
                'update',
                'vehicle',
                $oldData,
                $vehicle->only(array_keys($data)),
                $ip,
            );

            event(new VehicleApprovalRequested($vehicle));

            return $vehicle;
        });
    }

    public function approveVehicle(int $vehicleId, int $approvedBy, ?string $ip = null): Vehicle
    {
        return DB::transaction(function () use ($vehicleId, $approvedBy, $ip) {
            $vehicle = $this->vehicleRepository->findByIdOrFail($vehicleId);

            if ($vehicle->approval_status !== VehicleApprovalStatus::Pending) {
                throw new \InvalidArgumentException('Only pending vehicles can be approved.');
            }

            $oldData = $vehicle->toArray();
            $vehicle = $this->vehicleRepository->approveVehicle($vehicleId, $approvedBy);

            $this->logAudit($vehicle->customer_id, $approvedBy, 'approve', 'vehicle', $oldData, $vehicle->toArray(), $ip);

            return $vehicle;
        });
    }

    public function rejectVehicle(int $vehicleId, int $rejectedBy, ?string $ip = null): void
    {
        DB::transaction(function () use ($vehicleId, $rejectedBy, $ip) {
            $vehicle = $this->vehicleRepository->findByIdOrFail($vehicleId);

            if ($vehicle->approval_status !== VehicleApprovalStatus::Pending) {
                throw new \InvalidArgumentException('Only pending vehicles can be rejected.');
            }

            $oldData = $vehicle->toArray();
            $this->vehicleRepository->rejectVehicle($vehicleId);

            $this->logAudit($vehicle->customer_id, $rejectedBy, 'reject', 'vehicle', $oldData, [
                'approval_status' => 'rejected',
            ], $ip);
        });
    }

    public function deleteVehicle(int $vehicleId, int $userId, ?string $ip = null): void
    {
        DB::transaction(function () use ($vehicleId, $userId, $ip) {
            $vehicle = $this->vehicleRepository->findByIdOrFail($vehicleId);
            $oldData = $vehicle->toArray();

            $this->vehicleRepository->deleteVehicle($vehicleId);

            $this->logAudit($vehicle->customer_id, $userId, 'delete', 'vehicle', $oldData, null, $ip);
        });
    }

    public function getCustomerVehicles(int $customerId): Collection
    {
        $this->customerRepository->findByIdOrFail($customerId);

        return $this->vehicleRepository->getByCustomer($customerId);
    }

    private function logAudit(
        int $customerId,
        ?int $userId,
        string $action,
        string $entityType,
        ?array $oldData,
        ?array $newData,
        ?string $ip = null,
    ): void {
        CustomerAuditLog::create([
            'customer_id' => $customerId,
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'old_data' => $oldData,
            'new_data' => $newData,
            'ip_address' => $ip,
        ]);
    }
}
