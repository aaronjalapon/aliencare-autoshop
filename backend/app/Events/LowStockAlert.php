<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Inventory;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LowStockAlert
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $inventory;

    public $alertLevel;

    public $timestamp;

    /**
     * Create a new event instance.
     */
    public function __construct(Inventory $inventory)
    {
        $this->inventory = $inventory;
        $this->alertLevel = $this->determineAlertLevel($inventory);
        $this->timestamp = now();
    }

    /**
     * Determine alert level based on stock.
     */
    private function determineAlertLevel(Inventory $inventory): string
    {
        if ($inventory->stock == 0) {
            return 'critical';
        } elseif ($inventory->stock <= ($inventory->reorder_level * 0.5)) {
            return 'high';
        } else {
            return 'medium';
        }
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('low-stock-alerts'),
        ];
    }
}
