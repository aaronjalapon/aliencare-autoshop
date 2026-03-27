<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Inventory;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StockUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $inventory;

    public $action;

    public $timestamp;

    /**
     * Create a new event instance.
     */
    public function __construct(Inventory $inventory, string $action)
    {
        $this->inventory = $inventory;
        $this->action = $action;
        $this->timestamp = now();
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('inventory-updates'),
        ];
    }
}
