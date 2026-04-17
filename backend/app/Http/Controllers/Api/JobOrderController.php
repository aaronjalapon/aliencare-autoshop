<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\JobOrderRepositoryInterface;
use App\Contracts\Services\JobOrderServiceInterface;
use App\Exceptions\JobOrderNotFoundException;
use App\Exceptions\JobOrderStateException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\JobOrder\AddJobOrderItemRequest;
use App\Http\Requests\Api\JobOrder\SettleJobOrderRequest;
use App\Http\Requests\Api\JobOrder\StartJobOrderRequest;
use App\Http\Requests\Api\JobOrder\StoreJobOrderRequest;
use App\Http\Requests\Api\JobOrder\UpdateJobOrderRequest;
use App\Http\Resources\JobOrderItemResource;
use App\Http\Resources\JobOrderResource;
use App\Models\JobOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class JobOrderController extends Controller
{
    public function __construct(
        private JobOrderRepositoryInterface $jobOrderRepository,
        private JobOrderServiceInterface $jobOrderService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeManageJobOrders();

        $filters = array_filter([
            'status' => $request->input('status'),
            'source' => $request->input('source'),
            'customer_id' => $request->input('customer_id'),
            'mechanic_id' => $request->input('mechanic_id'),
            'search' => $request->input('search'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ], fn ($value) => $value !== null);

        $jobOrders = $this->jobOrderRepository->all(
            $filters,
            (int) $request->get('per_page', 15)
        );

        return response()->json([
            'success' => true,
            'data' => JobOrderResource::collection($jobOrders)->response()->getData(),
        ]);
    }

    public function store(StoreJobOrderRequest $request): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderService->createJobOrder($request->validated());

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order created successfully.',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create job order: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderRepository->findByIdOrFail($id);

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Job order not found.',
            ], 404);
        }
    }

    public function update(UpdateJobOrderRequest $request, int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderRepository->update($id, $request->validated());

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order updated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update job order: '.$e->getMessage(),
            ], 500);
        }
    }

    public function submit(int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderService->submitJobOrderForApproval($id);

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order submitted for approval.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    public function approve(int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderService->approveJobOrder($id, Auth::id());

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order approved successfully.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    public function start(StartJobOrderRequest $request, int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderService->startJobOrder(
                $id,
                (int) $request->input('mechanic_id'),
                (int) $request->input('bay_id')
            );

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order started. Mechanic and bay assigned.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    public function complete(int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderService->completeJobOrder($id);

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order completed. Bay and mechanic released.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    public function settle(SettleJobOrderRequest $request, int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderService->settleJobOrder(
                $id,
                $request->input('invoice_id')
            );

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order settled and closed.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    public function cancel(int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $jobOrder = $this->jobOrderService->cancelJobOrder($id);

            return response()->json([
                'success' => true,
                'data' => new JobOrderResource($this->loadJobOrderForResponse($jobOrder)),
                'message' => 'Job order cancelled.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    public function addItem(AddJobOrderItemRequest $request, int $id): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $item = $this->jobOrderService->addItemToJobOrder($id, $request->validated());

            return response()->json([
                'success' => true,
                'data' => new JobOrderItemResource($item),
                'message' => 'Item added to job order.',
            ], 201);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    public function removeItem(int $id, int $itemId): JsonResponse
    {
        $this->authorizeManageJobOrders();

        try {
            $this->jobOrderService->removeItemFromJobOrder($id, $itemId);

            return response()->json([
                'success' => true,
                'message' => 'Item removed from job order.',
            ]);
        } catch (JobOrderNotFoundException|JobOrderStateException $e) {
            return $e->render();
        }
    }

    private function authorizeManageJobOrders(): void
    {
        Gate::authorize('manage-job-orders');
    }

    private function loadJobOrderForResponse(JobOrder $jobOrder): JobOrder
    {
        return $jobOrder->loadMissing([
            'service',
            'customer',
            'vehicle',
            'mechanic.user',
            'bay',
            'approvedByUser',
            'items',
            'reservations',
            'customerTransactions',
        ]);
    }
}
