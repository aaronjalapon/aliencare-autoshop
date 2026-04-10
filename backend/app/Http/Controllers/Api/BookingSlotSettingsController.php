<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\UpdateBookingSlotSettingsRequest;
use App\Models\BookingSlot;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class BookingSlotSettingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('manage-booking-slots');

        return response()->json([
            'success' => true,
            'data' => [
                'slots' => $this->formatSlots(BookingSlot::query()->ordered()->get()),
            ],
        ]);
    }

    public function update(UpdateBookingSlotSettingsRequest $request): JsonResponse
    {
        Gate::authorize('manage-booking-slots');

        DB::transaction(function () use ($request): void {
            $slots = collect($request->validated('slots'))
                ->values()
                ->map(function (array $slot, int $index): array {
                    $now = now();

                    return [
                        'time' => $slot['time'],
                        'capacity' => (int) $slot['capacity'],
                        'is_active' => (bool) ($slot['is_active'] ?? true),
                        'sort_order' => (int) ($slot['sort_order'] ?? ($index + 1)),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                });

            BookingSlot::query()->upsert(
                $slots->all(),
                ['time'],
                ['capacity', 'is_active', 'sort_order', 'updated_at']
            );

            BookingSlot::query()
                ->whereNotIn('time', $slots->pluck('time')->all())
                ->delete();
        });

        return response()->json([
            'success' => true,
            'data' => [
                'slots' => $this->formatSlots(BookingSlot::query()->ordered()->get()),
            ],
            'message' => 'Booking slot settings updated successfully.',
        ]);
    }

    /**
     * @param  iterable<BookingSlot>  $slots
     * @return array<int, array<string, mixed>>
     */
    private function formatSlots(iterable $slots): array
    {
        return collect($slots)
            ->map(static fn (BookingSlot $slot): array => [
                'id' => $slot->id,
                'time' => $slot->time,
                'label' => Carbon::createFromFormat('H:i', $slot->time)->format('g:i A'),
                'capacity' => (int) $slot->capacity,
                'is_active' => (bool) $slot->is_active,
                'sort_order' => (int) $slot->sort_order,
            ])
            ->values()
            ->all();
    }
}
