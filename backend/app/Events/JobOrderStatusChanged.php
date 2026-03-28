<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\JobOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JobOrderStatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $jobOrder;

    public $previousStatus;

    public $newStatus;

    public $timestamp;

    public function __construct(JobOrder $jobOrder, string $previousStatus, string $newStatus)
    {
        $this->jobOrder = $jobOrder;
        $this->previousStatus = $previousStatus;
        $this->newStatus = $newStatus;
        $this->timestamp = now();
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('job-orders'),
        ];
    }
}
