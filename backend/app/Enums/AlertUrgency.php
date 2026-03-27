<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Alert urgency level enumeration.
 */
enum AlertUrgency: string
{
    case Critical = 'critical';
    case High = 'high';
    case Medium = 'medium';
    case Low = 'low';

    /**
     * Get the human-readable label for the urgency level.
     */
    public function label(): string
    {
        return match ($this) {
            self::Critical => 'Critical',
            self::High => 'High',
            self::Medium => 'Medium',
            self::Low => 'Low',
        };
    }

    /**
     * Get the color/badge class for UI display.
     */
    public function color(): string
    {
        return match ($this) {
            self::Critical => 'red',
            self::High => 'orange',
            self::Medium => 'yellow',
            self::Low => 'blue',
        };
    }

    /**
     * Get the numeric priority for sorting (lower = more urgent).
     */
    public function priority(): int
    {
        return match ($this) {
            self::Critical => 1,
            self::High => 2,
            self::Medium => 3,
            self::Low => 4,
        };
    }

    /**
     * Determine if this urgency level requires immediate attention.
     */
    public function requiresImmediateAttention(): bool
    {
        return match ($this) {
            self::Critical, self::High => true,
            self::Medium, self::Low => false,
        };
    }
}
