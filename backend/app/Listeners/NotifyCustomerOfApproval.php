<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CustomerAccountApproved;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class NotifyCustomerOfApproval implements ShouldQueue
{
    public function handle(CustomerAccountApproved $event): void
    {
        Log::info('Customer account approved', [
            'customer_id' => $event->customer->id,
            'name' => $event->customer->full_name,
            'approved_by' => $event->approvedBy,
        ]);
    }
}
