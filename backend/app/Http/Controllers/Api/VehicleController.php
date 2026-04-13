<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\VehicleRepositoryInterface;
use App\Contracts\Services\VehicleServiceInterface;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Vehicle\StoreVehicleRequest;
use App\Http\Requests\Api\Vehicle\UpdateVehicleRequest;
use App\Http\Resources\VehicleResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function __construct(
        private VehicleRepositoryInterface $vehicleRepository,
        private VehicleServiceInterface $vehicleService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = array_filter([
            'customer_id' => $request->input('customer_id'),
            'search' => $request->input('search'),
        ], fn ($value) => $value !== null);

        $vehicles = $this->vehicleRepository->all(
            $filters,
            (int) $request->get('per_page', 15)
        );

        return response()->json([
            'success' => true,
            'data' => VehicleResource::collection($vehicles)->response()->getData(),
        ]);
    }

    public function store(StoreVehicleRequest $request): JsonResponse
    {
        try {
            $requestedCustomerId = (int) $request->validated('customer_id');
            if ($response = $this->ensureCustomerOwnsCustomerId($request, $requestedCustomerId)) {
                return $response;
            }

            $vehicle = $this->vehicleService->addVehicle(
                $requestedCustomerId,
                $request->safe()->except('customer_id'),
                $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new VehicleResource($vehicle),
                'message' => 'Vehicle registered successfully.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to register vehicle: '.$e->getMessage(),
            ], 500);
        }
    }

    public function storeForCustomer(StoreVehicleRequest $request, int $customerId): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsCustomerId($request, $customerId)) {
                return $response;
            }

            $vehicle = $this->vehicleService->addVehicle(
                $customerId,
                $request->safe()->except('customer_id'),
                $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new VehicleResource($vehicle),
                'message' => 'Vehicle added to customer.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add vehicle: '.$e->getMessage(),
            ], 500);
        }
    }

    public function update(UpdateVehicleRequest $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsVehicle($request, $id)) {
                return $response;
            }

            $vehicle = $this->vehicleService->updateVehicle(
                $id,
                $request->validated(),
                $request->user()->id,
                $request->ip(),
            );

            return response()->json([
                'success' => true,
                'data' => new VehicleResource($vehicle),
                'message' => 'Vehicle updated. Pending approval.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update vehicle: '.$e->getMessage(),
            ], 500);
        }
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        try {
            $this->authorize('approve-vehicles');

            $vehicle = $this->vehicleService->approveVehicle($id, $request->user()->id, $request->ip());

            return response()->json([
                'success' => true,
                'data' => new VehicleResource($vehicle),
                'message' => 'Vehicle approved.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve vehicle: '.$e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            if ($response = $this->ensureCustomerOwnsVehicle($request, $id)) {
                return $response;
            }

            $this->vehicleService->deleteVehicle($id, $request->user()->id, $request->ip());

            return response()->json([
                'success' => true,
                'message' => 'Vehicle deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete vehicle: '.$e->getMessage(),
            ], 500);
        }
    }

    private function ensureCustomerOwnsCustomerId(Request $request, int $customerId): ?JsonResponse
    {
        if (! $this->isCustomerRole($request->user()?->role)) {
            return null;
        }

        $customer = Customer::where('email', $request->user()?->email)->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'No customer record linked to this account.',
            ], 404);
        }

        if ((int) $customer->id !== $customerId) {
            return response()->json([
                'success' => false,
                'message' => 'You are not allowed to modify this customer vehicle.',
            ], 403);
        }

        return null;
    }

    private function ensureCustomerOwnsVehicle(Request $request, int $vehicleId): ?JsonResponse
    {
        if (! $this->isCustomerRole($request->user()?->role)) {
            return null;
        }

        $customer = Customer::where('email', $request->user()?->email)->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'No customer record linked to this account.',
            ], 404);
        }

        $vehicle = $this->vehicleRepository->findById($vehicleId);

        if (! $vehicle) {
            return response()->json([
                'success' => false,
                'message' => 'Vehicle not found.',
            ], 404);
        }

        if ((int) $vehicle->customer_id !== (int) $customer->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not allowed to modify this vehicle.',
            ], 403);
        }

        return null;
    }

    private function isCustomerRole(mixed $role): bool
    {
        return $role === UserRole::Customer || $role === UserRole::Customer->value;
    }
}
