<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\ReservationUpdated;
use App\Models\Archive;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LogReservationActivity implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(ReservationUpdated $event): void
    {
        try {
            $reservation = $event->reservation;

            Archive::create([
                'entity_type' => 'reservation',
                'entity_id' => $reservation->reservation_id,
                'action' => $event->action,
                'old_data' => $reservation->getOriginal(),
                'new_data' => $reservation->getAttributes(),
                'user_id' => Auth::id() ?? null,
                'reference_number' => $reservation->job_order_number,
                'notes' => "Reservation {$event->action} for job order: {$reservation->job_order_number}",
                'archived_date' => $event->timestamp,
            ]);

            Log::info("Reservation {$event->action}", [
                'reservation_id' => $reservation->reservation_id,
                'item_id' => $reservation->item_id,
                'quantity' => $reservation->quantity,
                'job_order' => $reservation->job_order_number,
                'status' => $reservation->status,
                'timestamp' => $event->timestamp,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to log reservation activity: '.$e->getMessage(), [
                'reservation_id' => $event->reservation->reservation_id,
                'action' => $event->action,
            ]);
        }
    }
}
