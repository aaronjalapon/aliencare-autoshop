<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\VehicleRepositoryInterface;
use App\Contracts\Services\VehicleServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Vehicle\StoreVehicleRequest;
use App\Http\Requests\Api\Vehicle\UpdateVehicleRequest;
use App\Http\Resources\VehicleResource;
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
            $vehicle = $this->vehicleService->addVehicle(
                (int) $request->validated('customer_id'),
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
}
