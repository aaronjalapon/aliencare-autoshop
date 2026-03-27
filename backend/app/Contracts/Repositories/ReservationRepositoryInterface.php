<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Reservation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Interface for Reservation Repository operations.
 *
 * Defines the contract for reservation data access including CRUD operations,
 * filtering, and status-related queries.
 */
interface ReservationRepositoryInterface
{
    /**
     * Find a reservation by its ID.
     *
     * @param int $id The unique identifier for the reservation
     */
    public function findById(int|string $id): ?Reservation;

    /**
     * Find a reservation by ID or throw an exception.
     *
     * @param int $id The unique identifier for the reservation
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function findByIdOrFail(int|string $id): Reservation;

    /**
     * Get paginated reservations with optional filters.
     *
     * @param array{
     *     status?: string,
     *     item_id?: int,
     *     job_order_number?: string,
     *     start_date?: string,
     *     end_date?: string
     * } $filters Optional filters to apply
     * @param int $perPage Number of items per page
     */
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Create a new reservation.
     *
     * @param array<string, mixed> $data The reservation data
     */
    public function create(array $data): Reservation;

    /**
     * Update an existing reservation.
     *
     * @param int $id The unique identifier for the reservation
     * @param array<string, mixed> $data The data to update
     */
    public function update(int|string $id, array $data): Reservation;

    /**
     * Get all active (pending or approved) reservations.
     */
    public function getActiveReservations(): Collection;

    /**
     * Get count of pending reservations.
     */
    public function getPendingCount(): int;

    /**
     * Get count of approved reservations.
     */
    public function getApprovedCount(): int;

    /**
     * Get reservations expiring within the specified number of days.
     *
     * @param int $days Number of days to look ahead
     */
    public function getExpiringSoon(int $days = 3): Collection;

    /**
     * Get all reservations for a specific job order.
     *
     * @param string $jobOrderNumber The job order number
     */
    public function getByJobOrder(string $jobOrderNumber): Collection;

    /**
     * Get all reservations with a specific status.
     *
     * @param string $status The reservation status
     */
    public function getByStatus(string $status): Collection;

    /**
     * Get total reserved quantity for a specific inventory item.
     *
     * @param int $itemId The inventory item ID
     */
    public function getReservedQuantityForItem(int $itemId): int;
}
