<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Mechanic availability status enumeration.
 */
enum MechanicAvailability: string
{
    case Available = 'available';
    case Busy = 'busy';
    case OnLeave = 'on_leave';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Available => 'Available',
            self::Busy => 'Busy',
            self::OnLeave => 'On Leave',
        };
    }

    /**
     * Get the color/badge class for UI display.
     */
    public function color(): string
    {
        return match ($this) {
            self::Available => 'green',
            self::Busy => 'orange',
            self::OnLeave => 'gray',
        };
    }
}
