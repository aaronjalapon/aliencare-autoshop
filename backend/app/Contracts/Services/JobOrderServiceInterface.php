<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\JobOrder;
use App\Models\JobOrderItem;

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

    public function cancelJobOrder(int $id): JobOrder;

    /**
     * @param  array<string, mixed>  $itemData
     */
    public function addItemToJobOrder(int $jobOrderId, array $itemData): JobOrderItem;

    public function removeItemFromJobOrder(int $jobOrderId, int $itemId): bool;
}
