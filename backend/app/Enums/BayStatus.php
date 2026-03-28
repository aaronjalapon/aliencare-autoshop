<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Service bay status enumeration.
 */
enum BayStatus: string
{
    case Available = 'available';
    case Occupied = 'occupied';
    case Maintenance = 'maintenance';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Available => 'Available',
            self::Occupied => 'Occupied',
            self::Maintenance => 'Under Maintenance',
        };
    }

    /**
     * Get the color/badge class for UI display.
     */
    public function color(): string
    {
        return match ($this) {
            self::Available => 'green',
            self::Occupied => 'red',
            self::Maintenance => 'yellow',
        };
    }
}
