<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\JobOrderStatusChanged;
use App\Models\Archive;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LogJobOrderActivity implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(JobOrderStatusChanged $event): void
    {
        try {
            $jobOrder = $event->jobOrder;

            Archive::create([
                'entity_type' => 'job_order',
                'entity_id' => $jobOrder->id,
                'action' => $event->newStatus,
                'old_data' => [
                    'status' => $event->previousStatus,
                ],
                'new_data' => [
                    'status' => $event->newStatus,
                    'jo_number' => $jobOrder->jo_number,
                    'customer_id' => $jobOrder->customer_id,
                    'mechanic_id' => $jobOrder->assigned_mechanic_id,
                    'bay_id' => $jobOrder->bay_id,
                ],
                'user_id' => Auth::id() ?? null,
                'reference_number' => $jobOrder->jo_number,
                'notes' => "Job order {$jobOrder->jo_number} status changed from {$event->previousStatus} to {$event->newStatus}.",
                'archived_date' => $event->timestamp,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to log job order activity: '.$e->getMessage(), [
                'job_order_id' => $event->jobOrder->id ?? null,
                'previous_status' => $event->previousStatus ?? null,
                'new_status' => $event->newStatus ?? null,
            ]);
        }
    }
}
