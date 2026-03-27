<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Reservation status enumeration.
 */
enum ReservationStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Rejected = 'rejected';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Approved => 'Approved',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
            self::Rejected => 'Rejected',
        };
    }

    /**
     * Get the color/badge class for UI display.
     */
    public function color(): string
    {
        return match ($this) {
            self::Pending => 'yellow',
            self::Approved => 'blue',
            self::Completed => 'green',
            self::Cancelled => 'gray',
            self::Rejected => 'red',
        };
    }

    /**
     * Check if the reservation can be modified.
     */
    public function canBeModified(): bool
    {
        return match ($this) {
            self::Pending, self::Approved => true,
            self::Completed, self::Cancelled, self::Rejected => false,
        };
    }

    /**
     * Check if the reservation is in a terminal state.
     */
    public function isTerminal(): bool
    {
        return match ($this) {
            self::Completed, self::Cancelled, self::Rejected => true,
            self::Pending, self::Approved => false,
        };
    }
}
