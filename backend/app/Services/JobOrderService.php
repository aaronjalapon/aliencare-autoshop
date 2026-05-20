<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\JobOrderRepositoryInterface;
use App\Contracts\Services\JobOrderServiceInterface;
use App\Enums\BayStatus;
use App\Enums\CustomerTransactionType;
use App\Enums\InvoiceStatus;
use App\Enums\JobOrderItemType;
use App\Enums\JobOrderSource;
use App\Enums\JobOrderStatus;
use App\Enums\MechanicAvailability;
use App\Events\JobOrderStatusChanged;
use App\Exceptions\JobOrderNotFoundException;
use App\Exceptions\JobOrderStateException;
use App\Models\Bay;
use App\Models\BookingSlot;
use App\Models\CustomerTransaction;
use App\Models\Archive;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\Mechanic;
use App\Models\Reservation;
use App\Models\ServiceCatalog;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class JobOrderService implements JobOrderServiceInterface
{
    public function __construct(
        private JobOrderRepositoryInterface $jobOrderRepository,
    ) {}

    public function createJobOrder(array $data): JobOrder
    {
        $data['source'] = JobOrderSource::WalkIn;

        $arrivalDate = $data['arrival_date'] ?? null;
        $arrivalTime = $data['arrival_time'] ?? null;

        // If date/time provided and slot has capacity, auto-approve
        if ($arrivalDate && $arrivalTime) {
            $slotSetting = BookingSlot::query()
                ->active()
                ->where('time', $arrivalTime)
                ->first();

            if ($slotSetting && $this->slotHasCapacity($arrivalDate, $slotSetting)) {
                $data['status'] = JobOrderStatus::Approved;
                $data['approved_at'] = now();
            } else {
                // Slot is full — still create but mark as pending_approval
                $data['status'] = JobOrderStatus::PendingApproval;
            }
        } else {
            // No slot info provided — legacy behavior, create as pending_approval
            $data['status'] = JobOrderStatus::PendingApproval;
        }

        $data['reservation_expires_at'] = now()->addHours(4);

        $jobOrder = $this->jobOrderRepository->create($data);

        Archive::create([
            'entity_type' => 'job_order',
            'entity_id' => $jobOrder->id,
            'action' => 'created',
            'old_data' => null,
            'new_data' => [
                'status' => $jobOrder->status->value,
                'jo_number' => $jobOrder->jo_number,
                'customer_id' => $jobOrder->customer_id,
                'arrival_date' => $jobOrder->arrival_date?->format('Y-m-d'),
                'arrival_time' => $jobOrder->arrival_time,
                'source' => $jobOrder->source?->value ?? (string) $jobOrder->source,
            ],
            'user_id' => Auth::id() ?? null,
            'reference_number' => $jobOrder->jo_number,
            'notes' => "Job order {$jobOrder->jo_number} created.",
            'archived_date' => now(),
        ]);

        return $jobOrder;
    }

    private function slotHasCapacity(string $arrivalDate, BookingSlot $slotSetting): bool
    {
        $bookedCount = $this->applyCapacityBlockingScope(
            JobOrder::query()
                ->whereDate('arrival_date', $arrivalDate)
                ->where('arrival_time', $slotSetting->time)
        )->count();

        return $bookedCount < $slotSetting->capacity;
    }

    private function applyCapacityBlockingScope(Builder $query): Builder
    {
        return $query->where(function (Builder $blocking): void {
            $blocking
                ->whereIn('status', [
                    JobOrderStatus::Approved->value,
                    JobOrderStatus::InProgress->value,
                    JobOrderStatus::Completed->value,
                    JobOrderStatus::Settled->value,
                ])
                ->orWhere(function (Builder $awaitingSettlementOrApproval): void {
                    $awaitingSettlementOrApproval
                        ->whereIn('status', [
                            JobOrderStatus::Created->value,
                            JobOrderStatus::PendingApproval->value,
                        ])
                        ->where(function (Builder $pendingHold): void {
                            $pendingHold
                                ->whereNull('reservation_expires_at')
                                ->orWhere('reservation_expires_at', '>', now())
                                ->orWhereExists(function ($transactionQuery): void {
                                    $transactionQuery
                                        ->select(DB::raw('1'))
                                        ->from('customer_transactions')
                                        ->whereColumn('customer_transactions.job_order_id', 'job_orders.id')
                                        ->whereIn('customer_transactions.type', [
                                            CustomerTransactionType::Invoice->value,
                                            CustomerTransactionType::ReservationFee->value,
                                        ])
                                        ->where('customer_transactions.xendit_status', 'PAID');
                                });
                        });
                });
        });
    }

    public function submitJobOrderForApproval(int $id): JobOrder
    {
        return DB::transaction(function () use ($id) {
            $jobOrder = $this->findOrFail($id);

            $this->validateTransition($jobOrder, JobOrderStatus::PendingApproval);

            $previousStatus = $jobOrder->status->value;

            $jobOrder->update([
                'status' => JobOrderStatus::PendingApproval,
            ]);

            event(new JobOrderStatusChanged($jobOrder, $previousStatus, JobOrderStatus::PendingApproval->value));

            return $jobOrder->fresh(['customer', 'vehicle', 'mechanic.user', 'bay', 'items']);
        });
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

            // Validate resource availability for the scheduled time slot
            $this->validateResourceAvailability($jobOrder, $mechanic, $bay);

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

    /**
     * Validate that the mechanic and bay are available for the job order's scheduled time.
     */
    private function validateResourceAvailability(JobOrder $jobOrder, Mechanic $mechanic, Bay $bay): void
    {
        if ($mechanic->availability_status === MechanicAvailability::OnLeave) {
            throw new JobOrderStateException(
                $jobOrder->id,
                $jobOrder->status->value,
                JobOrderStatus::InProgress->value,
                "Mechanic '{$mechanic->user?->name}' is currently on leave and cannot be assigned."
            );
        }

        if ($bay->status === BayStatus::Maintenance) {
            throw new JobOrderStateException(
                $jobOrder->id,
                $jobOrder->status->value,
                JobOrderStatus::InProgress->value,
                "Bay '{$bay->name}' is under maintenance and cannot be assigned."
            );
        }

        // Check time-slot availability if the job order has a scheduled date/time
        if ($jobOrder->arrival_date && $jobOrder->arrival_time) {
            if (! $this->isMechanicAvailableAt($mechanic->id, $jobOrder->arrival_date->format('Y-m-d'), $jobOrder->arrival_time, $jobOrder->id)) {
                throw new JobOrderStateException(
                    $jobOrder->id,
                    $jobOrder->status->value,
                    JobOrderStatus::InProgress->value,
                    "Mechanic '{$mechanic->user?->name}' has a conflicting job order at the scheduled time ({$jobOrder->arrival_time})."
                );
            }

            if (! $this->isBayAvailableAt($bay->id, $jobOrder->arrival_date->format('Y-m-d'), $jobOrder->arrival_time, $jobOrder->id)) {
                throw new JobOrderStateException(
                    $jobOrder->id,
                    $jobOrder->status->value,
                    JobOrderStatus::InProgress->value,
                    "Bay '{$bay->name}' has a conflicting job order at the scheduled time ({$jobOrder->arrival_time})."
                );
            }
        }
    }

    /**
     * Check if a mechanic has no conflicting job orders at the given date and time.
     */
    public function isMechanicAvailableAt(int $mechanicId, string $date, string $time, ?int $excludeJobOrderId = null): bool
    {
        $duration = 60; // default 60 minutes if we can't determine the service duration

        if ($excludeJobOrderId) {
            $jobOrder = JobOrder::find($excludeJobOrderId);
            if ($jobOrder) {
                $duration = $this->getServiceDuration($jobOrder);
            }
        }

        $conflictingCount = $this->getConflictingJobOrdersForMechanic($mechanicId, $date, $time, $duration, $excludeJobOrderId)->count();

        return $conflictingCount === 0;
    }

    /**
     * Check if a bay has no conflicting job orders at the given date and time.
     */
    public function isBayAvailableAt(int $bayId, string $date, string $time, ?int $excludeJobOrderId = null): bool
    {
        $duration = 60;

        if ($excludeJobOrderId) {
            $jobOrder = JobOrder::find($excludeJobOrderId);
            if ($jobOrder) {
                $duration = $this->getServiceDuration($jobOrder);
            }
        }

        $conflictingCount = $this->getConflictingJobOrdersForBay($bayId, $date, $time, $duration, $excludeJobOrderId)->count();

        return $conflictingCount === 0;
    }

    /**
     * Get job orders that conflict with a mechanic at the given date/time window.
     */
    public function getConflictingJobOrdersForMechanic(int $mechanicId, string $date, string $targetTime, int $targetDurationMinutes = 60, ?int $excludeJobOrderId = null): Collection
    {
        $assignedJobs = JobOrder::query()
            ->where('assigned_mechanic_id', $mechanicId)
            ->whereDate('arrival_date', $date)
            ->whereNotNull('arrival_time')
            ->whereIn('status', [JobOrderStatus::InProgress->value, JobOrderStatus::Approved->value])
            ->when($excludeJobOrderId, fn ($q) => $q->where('id', '!=', $excludeJobOrderId))
            ->with('service')
            ->get();

        $targetStart = $this->parseTimeString($targetTime);
        $targetEnd = $targetStart->copy()->addMinutes($targetDurationMinutes);

        return $assignedJobs->filter(function (JobOrder $job) use ($targetStart, $targetEnd) {
            $jobStart = $this->parseTimeString($job->arrival_time);
            $jobDuration = $this->getServiceDuration($job);
            $jobEnd = $jobStart->copy()->addMinutes($jobDuration);

            // Two windows overlap if: start_a < end_b AND end_a > start_b
            return $targetStart->lt($jobEnd) && $targetEnd->gt($jobStart);
        });
    }

    /**
     * Get job orders that conflict with a bay at the given date/time window.
     */
    public function getConflictingJobOrdersForBay(int $bayId, string $date, string $targetTime, int $targetDurationMinutes = 60, ?int $excludeJobOrderId = null): Collection
    {
        $assignedJobs = JobOrder::query()
            ->where('bay_id', $bayId)
            ->whereDate('arrival_date', $date)
            ->whereNotNull('arrival_time')
            ->whereIn('status', [JobOrderStatus::InProgress->value, JobOrderStatus::Approved->value])
            ->when($excludeJobOrderId, fn ($q) => $q->where('id', '!=', $excludeJobOrderId))
            ->with('service')
            ->get();

        $targetStart = $this->parseTimeString($targetTime);
        $targetEnd = $targetStart->copy()->addMinutes($targetDurationMinutes);

        return $assignedJobs->filter(function (JobOrder $job) use ($targetStart, $targetEnd) {
            $jobStart = $this->parseTimeString($job->arrival_time);
            $jobDuration = $this->getServiceDuration($job);
            $jobEnd = $jobStart->copy()->addMinutes($jobDuration);

            return $targetStart->lt($jobEnd) && $targetEnd->gt($jobStart);
        });
    }

    /**
     * Parse a time string (H:i or H:i:s) into a Carbon instance.
     */
    private function parseTimeString(string $time): Carbon
    {
        $trimmed = trim($time);

        return strlen($trimmed) > 5
            ? Carbon::createFromFormat('H:i:s', $trimmed)
            : Carbon::createFromFormat('H:i', $trimmed);
    }

    /**
     * Get the service duration in minutes for a job order.
     */
    public function getServiceDuration(JobOrder $jobOrder): int
    {
        if ($jobOrder->relationLoaded('service') && $jobOrder->service) {
            return (int) ($jobOrder->service->duration ?: $jobOrder->service->estimated_duration ?: 60);
        }

        if ($jobOrder->service_id) {
            $service = ServiceCatalog::find($jobOrder->service_id);
            if ($service) {
                return (int) ($service->duration ?: $service->estimated_duration ?: 60);
            }
        }

        return 60;
    }

    /**
     * Get the service-type match score for a mechanic against a job order's service.
     * Returns 0-3 where 3 = strong match, 2 = good match, 1 = weak match, 0 = no match data.
     */
    public function getMechanicServiceMatchScore(Mechanic $mechanic, ?ServiceCatalog $service): int
    {
        if (! $service) {
            return 0;
        }

        $specialization = strtolower(trim((string) $mechanic->specialization));
        if (empty($specialization)) {
            return 1;
        }

        $serviceName = strtolower($service->name ?? '');
        $serviceCategory = strtolower($service->category?->value ?? '');
        $serviceDescription = strtolower($service->description ?? '');

        // Direct match: specialization appears in service name or description
        if (
            ($serviceName !== '' && str_contains($serviceName, $specialization))
            || ($serviceDescription !== '' && str_contains($serviceDescription, $specialization))
        ) {
            return 3;
        }

        // Category-to-specialization mapping
        $categorySpecializationMap = [
            'maintenance' => ['engine', 'transmission', 'electrical', 'ac & cooling', 'general'],
            'repair' => ['engine', 'transmission', 'electrical', 'ac & cooling', 'general'],
            'cleaning' => ['general'],
        ];

        if (isset($categorySpecializationMap[$serviceCategory]) && in_array($specialization, $categorySpecializationMap[$serviceCategory], true)) {
            return 2;
        }

        return 1;
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

            Archive::create([
                'entity_type' => 'job_order_item',
                'entity_id' => $item->id,
                'action' => 'item_added',
                'old_data' => null,
                'new_data' => [
                    'job_order_id' => $jobOrder->id,
                    'jo_number' => $jobOrder->jo_number,
                    'item_type' => $item->item_type->value,
                    'item_id' => $item->item_id,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->total_price,
                ],
                'user_id' => Auth::id() ?? null,
                'reference_number' => $jobOrder->jo_number,
                'notes' => "Item added to job order {$jobOrder->jo_number}.",
                'archived_date' => now(),
            ]);

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

            $oldData = $item->getAttributes();

            $deleted = (bool) $item->delete();

            if ($deleted) {
                Archive::create([
                    'entity_type' => 'job_order_item',
                    'entity_id' => $itemId,
                    'action' => 'item_removed',
                    'old_data' => $oldData,
                    'new_data' => null,
                    'user_id' => Auth::id() ?? null,
                    'reference_number' => $jobOrder->jo_number,
                    'notes' => "Item removed from job order {$jobOrder->jo_number}.",
                    'archived_date' => now(),
                ]);
            }

            return $deleted;
        });
    }

    public function updateJobOrderItem(int $jobOrderId, int $itemId, array $itemData): JobOrderItem
    {
        return DB::transaction(function () use ($jobOrderId, $itemId, $itemData) {
            $jobOrder = $this->findOrFail($jobOrderId);

            if (! $jobOrder->status->canBeModified()) {
                throw new JobOrderStateException(
                    $jobOrder->id,
                    $jobOrder->status->value,
                    'modify',
                    "Cannot update items on a job order with status '{$jobOrder->status->value}'"
                );
            }

            $item = JobOrderItem::where('job_order_id', $jobOrderId)->findOrFail($itemId);

            $oldData = $item->getAttributes();

            $item->update([
                'description' => $itemData['description'] ?? $item->description,
                'quantity' => $itemData['quantity'] ?? $item->quantity,
                'unit_price' => $itemData['unit_price'] ?? $item->unit_price,
                'total_price' => ($itemData['quantity'] ?? $item->quantity) * ($itemData['unit_price'] ?? $item->unit_price),
            ]);

            Archive::create([
                'entity_type' => 'job_order_item',
                'entity_id' => $item->id,
                'action' => 'item_updated',
                'old_data' => $oldData,
                'new_data' => $item->getAttributes(),
                'user_id' => Auth::id() ?? null,
                'reference_number' => $jobOrder->jo_number,
                'notes' => "Item updated for job order {$jobOrder->jo_number}.",
                'archived_date' => now(),
            ]);

            return $item;
        });
    }

    public function prepareInvoice(int $jobOrderId, ?string $notes = null): CustomerTransaction
    {
        return DB::transaction(function () use ($jobOrderId, $notes) {
            $jobOrder = $this->findOrFail($jobOrderId);

            $billableStatuses = [JobOrderStatus::Approved, JobOrderStatus::InProgress, JobOrderStatus::Completed];

            if (! in_array($jobOrder->status, $billableStatuses, true)) {
                throw new JobOrderStateException(
                    $jobOrder->id,
                    $jobOrder->status->value,
                    'prepare-invoice',
                    "Cannot prepare invoice for a job order with status '{$jobOrder->status->value}'. Must be Approved, In Progress, or Completed."
                );
            }

            // Check for existing draft invoice
            $existing = CustomerTransaction::where('job_order_id', $jobOrder->id)
                ->where('type', CustomerTransactionType::Invoice)
                ->where('status', InvoiceStatus::Draft)
                ->exists();

            if ($existing) {
                throw new \RuntimeException('A draft invoice already exists for this job order.');
            }

            $total = $jobOrder->calculateTotalCost();

            $transaction = CustomerTransaction::create([
                'customer_id' => $jobOrder->customer_id,
                'job_order_id' => $jobOrder->id,
                'type' => CustomerTransactionType::Invoice,
                'status' => InvoiceStatus::Draft,
                'amount' => $total,
                'notes' => $notes,
                'reference_number' => $jobOrder->jo_number,
            ]);

            return $transaction;
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
