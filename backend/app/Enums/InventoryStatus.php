<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Inventory item status enumeration.
 */
enum InventoryStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Discontinued = 'discontinued';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Discontinued => 'Discontinued',
        };
    }

    /**
     * Get the color/badge class for UI display.
     */
    public function color(): string
    {
        return match ($this) {
            self::Active => 'green',
            self::Inactive => 'yellow',
            self::Discontinued => 'red',
        };
    }
}
