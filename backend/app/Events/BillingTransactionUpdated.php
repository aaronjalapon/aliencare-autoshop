<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\CustomerTransaction;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class BillingTransactionUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public CustomerTransaction $transaction,
        public string $action,
        public ?array $oldData,
        public array $newData,
        public Carbon $timestamp,
    ) {}
}
