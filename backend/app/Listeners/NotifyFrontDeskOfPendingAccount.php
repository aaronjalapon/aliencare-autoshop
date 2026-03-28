<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\CustomerAccountCreated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class NotifyFrontDeskOfPendingAccount implements ShouldQueue
{
    public function handle(CustomerAccountCreated $event): void
    {
        Log::info('New customer account pending approval', [
            'customer_id' => $event->customer->id,
            'name' => $event->customer->full_name,
        ]);
    }
}
