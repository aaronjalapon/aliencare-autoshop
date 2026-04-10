<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Exceptions\InsufficientStockException;
use App\Exceptions\InventoryNotFoundException;
use App\Exceptions\ReservationNotFoundException;
use App\Exceptions\ReservationStateException;
use App\Models\Customer;
use App\Models\Reservation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * Interface for Reservation Service operations.
 *
 * Defines the contract for reservation management including creating,
 * approving, rejecting, completing, and cancelling reservations.
 */
interface ReservationServiceInterface
{
    /**
     * Get all reservations with optional filtering.
     *
     * @param array{
     *     status?: string,
     *     job_order_number?: string,
     *     item_id?: string,
     *     start_date?: string,
     *     end_date?: string
     * } $filters Optional filters to apply
     * @param  int  $perPage  Number of items per page
     */
    public function getReservations(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Get a single reservation by ID.
     *
     * @param  int  $id  Reservation ID
     *
     * @throws ModelNotFoundException
     */
    public function getReservation(int $id): Reservation;

    /**
     * Reserve parts for a job order.
     *
     * @param  string  $itemId  The unique identifier for the inventory item
     * @param  int  $quantity  Quantity to reserve
     * @param  string  $jobOrderNumber  Job order reference number
     * @param  string|null  $notes  Optional notes
     * @param  string  $reservedBy  Identity of who created the reservation
     * @param  int|null  $customerId  The customer making the reservation (used for fee payment)
     * @return array{
     *     success: bool,
     *     reservation: Reservation,
     *     message: string
     * }
     *
     * @throws InventoryNotFoundException
     * @throws InsufficientStockException
     */
    public function reservePartsForJob(
        string $itemId,
        int $quantity,
        string $jobOrderNumber,
        ?string $notes = null,
        string $reservedBy = 'System',
        ?int $customerId = null
    ): array;

    /**
     * Reserve multiple parts for a single job order.
     *
     * @param  array<array{item_id: string, quantity: int}>  $items  Items to reserve
     * @param  string  $jobOrderNumber  Job order reference number
     * @param  string|null  $notes  Optional notes
     * @param  string  $reservedBy  Identity of who created the reservations
     * @return array{
     *     success: bool,
     *     reservations: array,
     *     failed: array,
     *     message: string
     * }
     */
    public function reserveMultiplePartsForJob(
        array $items,
        string $jobOrderNumber,
        ?string $notes = null,
        string $reservedBy = 'System'
    ): array;

    /**
     * Approve a pending reservation.
     *
     * @param  int  $id  Reservation ID
     * @param  string  $approvedBy  Identity of approver
     *
     * @throws ModelNotFoundException
     * @throws \InvalidArgumentException When reservation cannot be approved
     */
    public function approveReservation(int $id, string $approvedBy = 'System'): Reservation;

    /**
     * Reject a pending reservation.
     *
     * @param  int  $id  Reservation ID
     * @param  string|null  $reason  Reason for rejection
     * @param  string  $rejectedBy  Identity of who rejected
     *
     * @throws ModelNotFoundException
     * @throws \InvalidArgumentException When reservation cannot be rejected
     */
    public function rejectReservation(int $id, ?string $reason = null, string $rejectedBy = 'System'): Reservation;

    /**
     * Complete a reservation (parts used).
     *
     * @param  int  $id  Reservation ID
     * @param  string  $completedBy  Identity of who completed
     *
     * @throws ModelNotFoundException
     * @throws \InvalidArgumentException When reservation cannot be completed
     */
    public function completeReservation(int $id, string $completedBy = 'System'): Reservation;

    /**
     * Cancel a reservation.
     *
     * @param  int  $id  Reservation ID
     * @param  string|null  $reason  Reason for cancellation
     * @param  string  $cancelledBy  Identity of who cancelled
     *
     * @throws ModelNotFoundException
     * @throws \InvalidArgumentException When reservation cannot be cancelled
     */
    public function cancelReservation(int $id, ?string $reason = null, string $cancelledBy = 'System'): Reservation;

    /**
     * Get summary of active reservations.
     *
     * @return array{
     *     total_active: int,
     *     pending: int,
     *     approved: int,
     *     total_reserved_value: float,
     *     by_category: Collection
     * }
     */
    public function getActiveReservationsSummary(): array;

    /**
     * Initiate a Xendit payment for the reservation fee.
     * Returns an existing pending payment URL if one already exists.
     *
     * @param  int  $id  Reservation ID
     * @param  Customer  $customer  The customer paying the fee
     *
     * @throws ReservationNotFoundException
     * @throws ReservationStateException
     */
    public function initiateFeePay(int $id, Customer $customer): string;
}
