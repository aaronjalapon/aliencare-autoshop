<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CustomerAccountRejected;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class NotifyCustomerOfRejection implements ShouldQueue
{
    public function handle(CustomerAccountRejected $event): void
    {
        Log::info('Customer account rejected', [
            'customer_id' => $event->customer->id,
            'name' => $event->customer->full_name,
            'reason' => $event->reason,
        ]);
    }
}
