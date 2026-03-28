<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Customer;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CustomerAccountRejected
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Customer $customer,
        public string $reason,
    ) {}
}
