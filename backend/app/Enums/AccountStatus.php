<?php

declare(strict_types=1);

namespace App\Enums;

enum AccountStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Deleted = 'deleted';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
            self::Deleted => 'Deleted',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending => 'yellow',
            self::Approved => 'green',
            self::Rejected => 'red',
            self::Deleted => 'gray',
        };
    }
}
