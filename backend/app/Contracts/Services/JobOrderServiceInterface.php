<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\Mechanic;
use App\Models\ServiceCatalog;
use Illuminate\Database\Eloquent\Collection;

interface JobOrderServiceInterface
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function createJobOrder(array $data): JobOrder;

    public function submitJobOrderForApproval(int $id): JobOrder;

    public function approveJobOrder(int $id, int $approvedByUserId): JobOrder;

    public function startJobOrder(int $id, int $mechanicId, int $bayId): JobOrder;

    public function completeJobOrder(int $id): JobOrder;

    public function settleJobOrder(int $id, ?string $invoiceId = null): JobOrder;

    public function prepareInvoice(int $jobOrderId, ?string $notes = null): CustomerTransaction;

    public function cancelJobOrder(int $id): JobOrder;

    /**
     * @param  array<string, mixed>  $itemData
     */
    public function addItemToJobOrder(int $jobOrderId, array $itemData): JobOrderItem;

    public function removeItemFromJobOrder(int $jobOrderId, int $itemId): bool;

    /**
     * @param  array<string, mixed>  $itemData
     */
    public function updateJobOrderItem(int $jobOrderId, int $itemId, array $itemData): JobOrderItem;

    /**
     * Check if a mechanic has no conflicting job orders at the given date and time.
     */
    public function isMechanicAvailableAt(int $mechanicId, string $date, string $time, ?int $excludeJobOrderId = null): bool;

    /**
     * Check if a bay has no conflicting job orders at the given date and time.
     */
    public function isBayAvailableAt(int $bayId, string $date, string $time, ?int $excludeJobOrderId = null): bool;

    /**
     * Get conflicting job orders for a mechanic at a given date/time window.
     */
    public function getConflictingJobOrdersForMechanic(int $mechanicId, string $date, string $targetTime, int $targetDurationMinutes, ?int $excludeJobOrderId): Collection;

    /**
     * Get conflicting job orders for a bay at a given date/time window.
     */
    public function getConflictingJobOrdersForBay(int $bayId, string $date, string $targetTime, int $targetDurationMinutes, ?int $excludeJobOrderId): Collection;

    /**
     * Get the service duration in minutes for a job order.
     */
    public function getServiceDuration(JobOrder $jobOrder): int;

    /**
     * Get the service-type match score (0-3) for a mechanic against a service.
     */
    public function getMechanicServiceMatchScore(Mechanic $mechanic, ?ServiceCatalog $service): int;
}
