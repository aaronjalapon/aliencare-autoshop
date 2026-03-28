<?php

declare(strict_types=1);

namespace App\Enums;

enum CustomerTransactionType: string
{
    case Invoice = 'invoice';
    case Payment = 'payment';
    case Refund = 'refund';

    public function label(): string
    {
        return match ($this) {
            self::Invoice => 'Invoice',
            self::Payment => 'Payment',
            self::Refund => 'Refund',
        };
    }
}
