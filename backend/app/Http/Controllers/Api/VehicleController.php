<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\VehicleRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Vehicle\StoreVehicleRequest;
use App\Http\Resources\VehicleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function __construct(
        private VehicleRepositoryInterface $vehicleRepository,
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
            $vehicle = $this->vehicleRepository->create($request->validated());

            return response()->json([
                'success' => true,
                'data' => new VehicleResource($vehicle->load('customer')),
                'message' => 'Vehicle registered successfully.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to register vehicle: '.$e->getMessage(),
            ], 500);
        }
    }
}
