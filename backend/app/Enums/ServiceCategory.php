<?php

declare(strict_types=1);

namespace App\Enums;

enum ServiceCategory: string
{
    case Maintenance = 'maintenance';
    case Cleaning = 'cleaning';
    case Repair = 'repair';

    public function label(): string
    {
        return match ($this) {
            self::Maintenance => 'Maintenance',
            self::Cleaning => 'Cleaning',
            self::Repair => 'Repair',
        };
    }
}
