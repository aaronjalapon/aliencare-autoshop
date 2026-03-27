<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Alert type enumeration.
 */
enum AlertType: string
{
    case LowStock = 'low_stock';
    case OutOfStock = 'out_of_stock';
    case Expiring = 'expiring';
    case ReorderPoint = 'reorder_point';
    case OverStock = 'over_stock';

    /**
     * Get the human-readable label for the alert type.
     */
    public function label(): string
    {
        return match ($this) {
            self::LowStock => 'Low Stock',
            self::OutOfStock => 'Out of Stock',
            self::Expiring => 'Expiring Soon',
            self::ReorderPoint => 'Reorder Point Reached',
            self::OverStock => 'Over Stock',
        };
    }

    /**
     * Get the default urgency for this alert type.
     */
    public function defaultUrgency(): AlertUrgency
    {
        return match ($this) {
            self::OutOfStock => AlertUrgency::Critical,
            self::LowStock, self::Expiring => AlertUrgency::High,
            self::ReorderPoint => AlertUrgency::Medium,
            self::OverStock => AlertUrgency::Low,
        };
    }

    /**
     * Get the icon name for UI display.
     */
    public function icon(): string
    {
        return match ($this) {
            self::LowStock => 'alert-triangle',
            self::OutOfStock => 'x-circle',
            self::Expiring => 'clock',
            self::ReorderPoint => 'shopping-cart',
            self::OverStock => 'package',
        };
    }
}
