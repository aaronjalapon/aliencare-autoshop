<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\JobOrderRepositoryInterface;
use App\Contracts\Services\JobOrderServiceInterface;
use App\Enums\BayStatus;
use App\Enums\JobOrderItemType;
use App\Enums\JobOrderStatus;
use App\Enums\MechanicAvailability;
use App\Events\JobOrderStatusChanged;
use App\Exceptions\JobOrderNotFoundException;
use App\Exceptions\JobOrderStateException;
use App\Models\Bay;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\Mechanic;
use App\Models\Reservation;
use Illuminate\Support\Facades\DB;

class JobOrderService implements JobOrderServiceInterface
{
    public function __construct(
        private JobOrderRepositoryInterface $jobOrderRepository,
    ) {}

    public function createJobOrder(array $data): JobOrder
    {
        $data['status'] = JobOrderStatus::Created;

        return $this->jobOrderRepository->create($data);
    }

    public function approveJobOrder(int $id, int $approvedByUserId): JobOrder
    {
        return DB::transaction(function () use ($id, $approvedByUserId) {
            $jobOrder = $this->findOrFail($id);

            $this->validateTransition($jobOrder, JobOrderStatus::Approved);

            $jobOrder->update([
                'status' => JobOrderStatus::Approved,
                'approved_by' => $approvedByUserId,
                'approved_at' => now(),
            ]);

            event(new JobOrderStatusChanged($jobOrder, 'pending_approval', 'approved'));

            return $jobOrder->fresh(['customer', 'vehicle', 'mechanic.user', 'bay', 'items']);
        });
    }

    public function startJobOrder(int $id, int $mechanicId, int $bayId): JobOrder
    {
        return DB::transaction(function () use ($id, $mechanicId, $bayId) {
            $jobOrder = $this->findOrFail($id);

            $this->validateTransition($jobOrder, JobOrderStatus::InProgress);

            $mechanic = Mechanic::findOrFail($mechanicId);
            $bay = Bay::findOrFail($bayId);

            // Mark mechanic as busy and bay as occupied
            $mechanic->update(['availability_status' => MechanicAvailability::Busy]);
            $bay->update(['status' => BayStatus::Occupied]);

            $previousStatus = $jobOrder->status->value;

            $jobOrder->update([
                'status' => JobOrderStatus::InProgress,
                'assigned_mechanic_id' => $mechanicId,
                'bay_id' => $bayId,
            ]);

            event(new JobOrderStatusChanged($jobOrder, $previousStatus, 'in_progress'));

            return $jobOrder->fresh(['customer', 'vehicle', 'mechanic.user', 'bay', 'items']);
        });
    }

    public function completeJobOrder(int $id): JobOrder
    {
        return DB::transaction(function () use ($id) {
            $jobOrder = $this->findOrFail($id);

            $this->validateTransition($jobOrder, JobOrderStatus::Completed);

            // Release bay and mechanic
            if ($jobOrder->bay) {
                $jobOrder->bay->update(['status' => BayStatus::Available]);
            }
            if ($jobOrder->mechanic) {
                $jobOrder->mechanic->update(['availability_status' => MechanicAvailability::Available]);
            }

            // Complete linked reservations
            Reservation::where('job_order_id', $jobOrder->id)
                ->whereIn('status', ['pending', 'approved'])
                ->update(['status' => 'completed']);

            $jobOrder->update(['status' => JobOrderStatus::Completed]);

            event(new JobOrderStatusChanged($jobOrder, 'in_progress', 'completed'));

            return $jobOrder->fresh(['customer', 'vehicle', 'mechanic.user', 'bay', 'items']);
        });
    }

    public function settleJobOrder(int $id, ?string $invoiceId = null): JobOrder
    {
        return DB::transaction(function () use ($id, $invoiceId) {
            $jobOrder = $this->findOrFail($id);

            $this->validateTransition($jobOrder, JobOrderStatus::Settled);

            $jobOrder->update([
                'status' => JobOrderStatus::Settled,
                'settled_flag' => true,
                'invoice_id' => $invoiceId,
            ]);

            event(new JobOrderStatusChanged($jobOrder, 'completed', 'settled'));

            return $jobOrder->fresh(['customer', 'vehicle', 'mechanic.user', 'bay', 'items']);
        });
    }

    public function cancelJobOrder(int $id): JobOrder
    {
        return DB::transaction(function () use ($id) {
            $jobOrder = $this->findOrFail($id);

            $this->validateTransition($jobOrder, JobOrderStatus::Cancelled);

            $previousStatus = $jobOrder->status->value;

            // Release bay and mechanic if assigned
            if ($jobOrder->bay && $jobOrder->bay->status === BayStatus::Occupied) {
                $jobOrder->bay->update(['status' => BayStatus::Available]);
            }
            if ($jobOrder->mechanic && $jobOrder->mechanic->availability_status === MechanicAvailability::Busy) {
                $jobOrder->mechanic->update(['availability_status' => MechanicAvailability::Available]);
            }

            // Cancel linked reservations
            Reservation::where('job_order_id', $jobOrder->id)
                ->whereIn('status', ['pending', 'approved'])
                ->update(['status' => 'cancelled']);

            $jobOrder->update(['status' => JobOrderStatus::Cancelled]);

            event(new JobOrderStatusChanged($jobOrder, $previousStatus, 'cancelled'));

            return $jobOrder->fresh(['customer', 'vehicle', 'mechanic.user', 'bay', 'items']);
        });
    }

    public function addItemToJobOrder(int $jobOrderId, array $itemData): JobOrderItem
    {
        return DB::transaction(function () use ($jobOrderId, $itemData) {
            $jobOrder = $this->findOrFail($jobOrderId);

            if (! $jobOrder->status->canBeModified()) {
                throw new JobOrderStateException(
                    $jobOrder->id,
                    $jobOrder->status->value,
                    'modify',
                    "Cannot add items to a job order with status '{$jobOrder->status->value}'"
                );
            }

            $itemData['job_order_id'] = $jobOrderId;
            $itemData['total_price'] = ($itemData['quantity'] ?? 1) * $itemData['unit_price'];

            $item = JobOrderItem::create($itemData);

            // If it's a part, create a reservation to reserve inventory
            if (($itemData['item_type'] ?? '') === JobOrderItemType::Part->value && ! empty($itemData['item_id'])) {
                Reservation::create([
                    'item_id' => $itemData['item_id'],
                    'quantity' => $itemData['quantity'] ?? 1,
                    'status' => 'pending',
                    'job_order_number' => $jobOrder->jo_number,
                    'job_order_id' => $jobOrder->id,
                    'requested_by' => 'System',
                    'requested_date' => now(),
                    'notes' => "Auto-reserved for job order {$jobOrder->jo_number}",
                ]);
            }

            return $item;
        });
    }

    public function removeItemFromJobOrder(int $jobOrderId, int $itemId): bool
    {
        return DB::transaction(function () use ($jobOrderId, $itemId) {
            $jobOrder = $this->findOrFail($jobOrderId);

            if (! $jobOrder->status->canBeModified()) {
                throw new JobOrderStateException(
                    $jobOrder->id,
                    $jobOrder->status->value,
                    'modify',
                    "Cannot remove items from a job order with status '{$jobOrder->status->value}'"
                );
            }

            $item = JobOrderItem::where('job_order_id', $jobOrderId)->findOrFail($itemId);

            // Cancel linked reservation if it's a part
            if ($item->item_type === JobOrderItemType::Part && $item->item_id) {
                Reservation::where('job_order_id', $jobOrderId)
                    ->where('item_id', $item->item_id)
                    ->whereIn('status', ['pending', 'approved'])
                    ->update(['status' => 'cancelled']);
            }

            return (bool) $item->delete();
        });
    }

    private function findOrFail(int $id): JobOrder
    {
        $jobOrder = $this->jobOrderRepository->findById($id);

        if (! $jobOrder) {
            throw new JobOrderNotFoundException($id);
        }

        return $jobOrder;
    }

    private function validateTransition(JobOrder $jobOrder, JobOrderStatus $targetStatus): void
    {
        if (! $jobOrder->status->canTransitionTo($targetStatus)) {
            throw new JobOrderStateException(
                $jobOrder->id,
                $jobOrder->status->value,
                $targetStatus->value
            );
        }
    }
}
