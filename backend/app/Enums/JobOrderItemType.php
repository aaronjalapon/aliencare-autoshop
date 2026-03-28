<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Job order item type enumeration.
 */
enum JobOrderItemType: string
{
    case Part = 'part';
    case Service = 'service';

    /**
     * Get the human-readable label for the type.
     */
    public function label(): string
    {
        return match ($this) {
            self::Part => 'Part',
            self::Service => 'Service',
        };
    }
}
