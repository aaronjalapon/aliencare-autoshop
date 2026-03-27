<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\InventoryRepositoryInterface;
use App\Contracts\Repositories\ReservationRepositoryInterface;
use App\Contracts\Repositories\StockTransactionRepositoryInterface;
use App\Contracts\Services\ReservationServiceInterface;
use App\Events\ReservationUpdated;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InventoryNotFoundException;
use App\Exceptions\ReservationNotFoundException;
use App\Exceptions\ReservationStateException;
use App\Models\Reservation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * Service class for reservation management operations.
 *
 * Handles creating, approving, rejecting, completing, and cancelling
 * reservations with stock management integration.
 */
class ReservationService implements ReservationServiceInterface
{
    public function __construct(
        private ReservationRepositoryInterface $reservationRepository,
        private InventoryRepositoryInterface $inventoryRepository,
        private StockTransactionRepositoryInterface $transactionRepository
    ) {}

    /**
     * {@inheritDoc}
     */
    public function getReservations(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->reservationRepository->all($filters, $perPage);
    }

    /**
     * {@inheritDoc}
     */
    public function getReservation(int $id): Reservation
    {
        $reservation = $this->reservationRepository->findById($id);

        if (!$reservation) {
            throw new ReservationNotFoundException($id);
        }

        return $reservation->load('inventory');
    }

    /**
     * {@inheritDoc}
     */
    public function reservePartsForJob(
        string $itemId,
        int $quantity,
        string $jobOrderNumber,
        ?string $notes = null,
        string $reservedBy = 'System'
    ): array {
        return DB::transaction(function () use ($itemId, $quantity, $jobOrderNumber, $notes, $reservedBy) {
            $inventory = $this->inventoryRepository->findByIdWithLock((int) $itemId);

            if (!$inventory) {
                throw new InventoryNotFoundException($itemId);
            }

            $availableStock = $inventory->getAvailableStockForReservation();

            if ($availableStock < $quantity) {
                throw new InsufficientStockException(
                    $itemId,
                    $availableStock,
                    $quantity,
                    "Insufficient available stock for reservation"
                );
            }

            $reservation = $this->reservationRepository->create([
                'item_id' => $inventory->item_id,
                'quantity' => $quantity,
                'status' => 'pending',
                'job_order_number' => $jobOrderNumber,
                'requested_by' => $reservedBy,
                'requested_date' => now(),
                'notes' => $notes,
                'expires_at' => now()->addDays(7),
            ]);

            event(new ReservationUpdated($reservation, 'created'));

            return [
                'success' => true,
                'reservation' => $reservation->load('inventory'),
                'message' => "Reservation #{$reservation->id} created successfully",
            ];
        });
    }

    /**
     * {@inheritDoc}
     */
    public function reserveMultiplePartsForJob(
        array $items,
        string $jobOrderNumber,
        ?string $notes = null,
        string $reservedBy = 'System'
    ): array {
        $reservations = [];
        $failed = [];

        foreach ($items as $item) {
            try {
                $result = $this->reservePartsForJob(
                    (string) $item['item_id'],
                    $item['quantity'],
                    $jobOrderNumber,
                    $notes,
                    $reservedBy
                );
                $reservations[] = $result['reservation'];
            } catch (\Exception $e) {
                $failed[] = [
                    'item_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'success' => count($failed) === 0,
            'reservations' => $reservations,
            'failed' => $failed,
            'message' => sprintf(
                '%d reservation(s) created, %d failed',
                count($reservations),
                count($failed)
            ),
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function approveReservation(int $id, string $approvedBy = 'System'): Reservation
    {
        return DB::transaction(function () use ($id, $approvedBy) {
            $reservation = $this->reservationRepository->findByIdOrFail($id);

            if ($reservation->status !== 'pending') {
                throw new ReservationStateException(
                    $id,
                    $reservation->status,
                    'approved',
                    "Only pending reservations can be approved"
                );
            }

            $inventory = $this->inventoryRepository->findByIdWithLock($reservation->item_id);

            if ($inventory->stock < $reservation->quantity) {
                throw new InsufficientStockException(
                    (string) $inventory->item_id,
                    $inventory->stock,
                    $reservation->quantity,
                    "Insufficient stock to approve reservation"
                );
            }

            // Deduct stock
            $previousStock = $inventory->stock;
            $inventory->stock -= $reservation->quantity;
            $inventory->save();

            // Log transaction
            $this->transactionRepository->create([
                'item_id' => $inventory->item_id,
                'transaction_type' => 'reservation',
                'quantity' => -$reservation->quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $inventory->stock,
                'reference_number' => $reservation->job_order_number,
                'notes' => "Approved reservation #{$reservation->id}",
                'created_by' => $approvedBy,
            ]);

            // Update reservation
            $reservation = $this->reservationRepository->update($id, [
                'status' => 'approved',
                'approved_by' => $approvedBy,
                'approved_date' => now(),
            ]);

            event(new ReservationUpdated($reservation, 'approved'));

            return $reservation->load('inventory');
        });
    }

    /**
     * {@inheritDoc}
     */
    public function rejectReservation(int $id, ?string $reason = null, string $rejectedBy = 'System'): Reservation
    {
        return DB::transaction(function () use ($id, $reason, $rejectedBy) {
            $reservation = $this->reservationRepository->findByIdOrFail($id);

            if ($reservation->status !== 'pending') {
                throw new ReservationStateException(
                    $id,
                    $reservation->status,
                    'rejected',
                    "Only pending reservations can be rejected"
                );
            }

            $reservation = $this->reservationRepository->update($id, [
                'status' => 'rejected',
                'notes' => $reason ? "Rejected: {$reason}" : $reservation->notes,
            ]);

            event(new ReservationUpdated($reservation, 'rejected'));

            return $reservation->load('inventory');
        });
    }

    /**
     * {@inheritDoc}
     */
    public function completeReservation(int $id, string $completedBy = 'System'): Reservation
    {
        return DB::transaction(function () use ($id, $completedBy) {
            $reservation = $this->reservationRepository->findByIdOrFail($id);

            if ($reservation->status !== 'approved') {
                throw new ReservationStateException(
                    $id,
                    $reservation->status,
                    'completed',
                    "Only approved reservations can be completed"
                );
            }

            $reservation = $this->reservationRepository->update($id, [
                'status' => 'completed',
                'estimated_completion' => now(),
            ]);

            event(new ReservationUpdated($reservation, 'completed'));

            return $reservation->load('inventory');
        });
    }

    /**
     * {@inheritDoc}
     */
    public function cancelReservation(int $id, ?string $reason = null, string $cancelledBy = 'System'): Reservation
    {
        return DB::transaction(function () use ($id, $reason, $cancelledBy) {
            $reservation = $this->reservationRepository->findByIdOrFail($id);

            if (!in_array($reservation->status, ['pending', 'approved'])) {
                throw new ReservationStateException(
                    $id,
                    $reservation->status,
                    'cancelled',
                    "Only pending or approved reservations can be cancelled"
                );
            }

            // If approved, restore stock
            if ($reservation->status === 'approved') {
                $inventory = $this->inventoryRepository->findByIdWithLock($reservation->item_id);
                $previousStock = $inventory->stock;
                $inventory->stock += $reservation->quantity;
                $inventory->save();

                $this->transactionRepository->create([
                    'item_id' => $inventory->item_id,
                    'transaction_type' => 'return',
                    'quantity' => $reservation->quantity,
                    'previous_stock' => $previousStock,
                    'new_stock' => $inventory->stock,
                    'reference_number' => $reservation->job_order_number,
                    'notes' => "Cancelled reservation #{$reservation->id}: {$reason}",
                    'created_by' => $cancelledBy,
                ]);
            }

            $reservation = $this->reservationRepository->update($id, [
                'status' => 'cancelled',
                'notes' => $reason ? "Cancelled: {$reason}" : $reservation->notes,
            ]);

            event(new ReservationUpdated($reservation, 'cancelled'));

            return $reservation->load('inventory');
        });
    }

    /**
     * {@inheritDoc}
     */
    public function getActiveReservationsSummary(): array
    {
        $activeReservations = $this->reservationRepository->getActiveReservations();

        $totalReservedValue = $activeReservations->sum(function ($reservation) {
            return $reservation->quantity * ($reservation->inventory->unit_price ?? 0);
        });

        $byCategory = $activeReservations->groupBy(fn ($r) => $r->inventory->category ?? 'Unknown')
            ->map(fn ($group) => [
                'count' => $group->count(),
                'quantity' => $group->sum('quantity'),
            ]);

        return [
            'total_active' => $activeReservations->count(),
            'pending' => $this->reservationRepository->getPendingCount(),
            'approved' => $this->reservationRepository->getApprovedCount(),
            'total_reserved_value' => $totalReservedValue,
            'by_category' => $byCategory,
        ];
    }
}
