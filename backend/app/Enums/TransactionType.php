<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Stock transaction type enumeration.
 */
enum TransactionType: string
{
    case Sale = 'sale';
    case Procurement = 'procurement';
    case Reservation = 'reservation';
    case Return = 'return';
    case Damage = 'damage';
    case AdjustmentIn = 'adjustment_in';
    case AdjustmentOut = 'adjustment_out';

    /**
     * Get the human-readable label for the transaction type.
     */
    public function label(): string
    {
        return match ($this) {
            self::Sale => 'Sale',
            self::Procurement => 'Procurement',
            self::Reservation => 'Reservation',
            self::Return => 'Return',
            self::Damage => 'Damage',
            self::AdjustmentIn => 'Adjustment (In)',
            self::AdjustmentOut => 'Adjustment (Out)',
        };
    }

    /**
     * Determine if this transaction type increases stock.
     */
    public function increasesStock(): bool
    {
        return match ($this) {
            self::Procurement, self::Return, self::AdjustmentIn => true,
            self::Sale, self::Reservation, self::Damage, self::AdjustmentOut => false,
        };
    }

    /**
     * Determine if this transaction type decreases stock.
     */
    public function decreasesStock(): bool
    {
        return ! $this->increasesStock();
    }

    /**
     * Get all transaction types that increase stock.
     *
     * @return array<TransactionType>
     */
    public static function stockIncreasing(): array
    {
        return [
            self::Procurement,
            self::Return,
            self::AdjustmentIn,
        ];
    }

    /**
     * Get all transaction types that decrease stock.
     *
     * @return array<TransactionType>
     */
    public static function stockDecreasing(): array
    {
        return [
            self::Sale,
            self::Reservation,
            self::Damage,
            self::AdjustmentOut,
        ];
    }
}
