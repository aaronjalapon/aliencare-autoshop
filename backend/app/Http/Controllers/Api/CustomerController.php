<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Customer\StoreCustomerRequest;
use App\Http\Requests\Api\Customer\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(
        private CustomerRepositoryInterface $customerRepository,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = array_filter([
            'status' => $request->input('status'),
            'search' => $request->input('search'),
        ], fn ($value) => $value !== null);

        $customers = $this->customerRepository->all(
            $filters,
            (int) $request->get('per_page', 15)
        );

        return response()->json([
            'success' => true,
            'data' => CustomerResource::collection($customers)->response()->getData(),
        ]);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        try {
            $customer = $this->customerRepository->create($request->validated());

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Customer created successfully.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create customer: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $customer = $this->customerRepository->findByIdOrFail($id);

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer->load('vehicles')),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }
    }

    public function update(UpdateCustomerRequest $request, int $id): JsonResponse
    {
        try {
            $customer = $this->customerRepository->update($id, $request->validated());

            return response()->json([
                'success' => true,
                'data' => new CustomerResource($customer),
                'message' => 'Customer updated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update customer: '.$e->getMessage(),
            ], 500);
        }
    }
}
