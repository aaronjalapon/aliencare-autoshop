<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Job order status enumeration with lifecycle transitions.
 */
enum JobOrderStatus: string
{
    case Created = 'created';
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Settled = 'settled';
    case Cancelled = 'cancelled';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Created => 'Created',
            self::PendingApproval => 'Pending Approval',
            self::Approved => 'Approved',
            self::InProgress => 'In Progress',
            self::Completed => 'Completed',
            self::Settled => 'Settled',
            self::Cancelled => 'Cancelled',
        };
    }

    /**
     * Get the color/badge class for UI display.
     */
    public function color(): string
    {
        return match ($this) {
            self::Created => 'gray',
            self::PendingApproval => 'yellow',
            self::Approved => 'blue',
            self::InProgress => 'orange',
            self::Completed => 'green',
            self::Settled => 'emerald',
            self::Cancelled => 'red',
        };
    }

    /**
     * Get the allowed transitions from this status.
     *
     * @return array<JobOrderStatus>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Created => [self::PendingApproval, self::Cancelled],
            self::PendingApproval => [self::Approved, self::Cancelled],
            self::Approved => [self::InProgress, self::Cancelled],
            self::InProgress => [self::Completed, self::Cancelled],
            self::Completed => [self::Settled],
            self::Settled => [],
            self::Cancelled => [],
        };
    }

    /**
     * Check if a transition to the given status is valid.
     */
    public function canTransitionTo(JobOrderStatus $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }

    /**
     * Check if the job order is in a terminal state.
     */
    public function isTerminal(): bool
    {
        return match ($this) {
            self::Settled, self::Cancelled => true,
            default => false,
        };
    }

    /**
     * Check if the job order can be modified (items added/removed).
     */
    public function canBeModified(): bool
    {
        return match ($this) {
            self::Created, self::PendingApproval, self::Approved, self::InProgress => true,
            self::Completed, self::Settled, self::Cancelled => false,
        };
    }
}
