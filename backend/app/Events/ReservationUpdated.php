<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Reservation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReservationUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $reservation;

    public $action;

    public $timestamp;

    /**
     * Create a new event instance.
     */
    public function __construct(Reservation $reservation, string $action)
    {
        $this->reservation = $reservation;
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
            new PrivateChannel('reservation-updates'),
        ];
    }
}
