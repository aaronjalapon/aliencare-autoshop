<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\ReservationServiceInterface;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InventoryNotFoundException;
use App\Exceptions\ReservationNotFoundException;
use App\Exceptions\ReservationStateException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Reservation\ApproveReservationRequest;
use App\Http\Requests\Api\Reservation\CancelReservationRequest;
use App\Http\Requests\Api\Reservation\CompleteReservationRequest;
use App\Http\Requests\Api\Reservation\RejectReservationRequest;
use App\Http\Requests\Api\Reservation\ReserveMultiplePartsRequest;
use App\Http\Requests\Api\Reservation\ReservePartsRequest;
use App\Http\Resources\ReservationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    public function __construct(
        private ReservationServiceInterface $reservationService
    ) {}

    /**
     * Display a listing of reservations.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'status' => $request->input('status'),
            'job_order_number' => $request->input('job_order'),
            'item_id' => $request->input('item_id'),
        ];

        // Remove null values
        $filters = array_filter($filters, fn ($value) => $value !== null);

        $reservations = $this->reservationService->getReservations(
            $filters,
            (int) $request->get('per_page', 15)
        );

        return response()->json([
            'success' => true,
            'data' => ReservationResource::collection($reservations)->response()->getData(),
        ]);
    }

    /**
     * Display the specified reservation.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $reservation = $this->reservationService->getReservation($id);

            return response()->json([
                'success' => true,
                'data' => new ReservationResource($reservation),
            ]);
        } catch (ReservationNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Reserve parts for job order.
     */
    public function reservePartsForJob(ReservePartsRequest $request): JsonResponse
    {
        try {
            $actorName = (string) ($request->user()?->name ?? 'System');

            $result = $this->reservationService->reservePartsForJob(
                (string) $request->input('item_id'),
                (int) $request->input('quantity'),
                $request->input('job_order_number'),
                $request->input('notes'),
                $actorName
            );

            return response()->json([
                'success' => true,
                'data' => new ReservationResource($result['reservation']),
                'message' => $result['message'],
            ], 201);
        } catch (InventoryNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Approve reservation.
     */
    public function approveReservation(int $reservationId, ApproveReservationRequest $request): JsonResponse
    {
        try {
            $actorName = (string) ($request->user()?->name ?? 'System');

            $reservation = $this->reservationService->approveReservation(
                $reservationId,
                $actorName
            );

            return response()->json([
                'success' => true,
                'data' => new ReservationResource($reservation),
                'message' => 'Reservation approved successfully',
            ]);
        } catch (ReservationNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (ReservationStateException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (InsufficientStockException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reject reservation.
     */
    public function rejectReservation(int $reservationId, RejectReservationRequest $request): JsonResponse
    {
        try {
            $actorName = (string) ($request->user()?->name ?? 'System');

            $reservation = $this->reservationService->rejectReservation(
                $reservationId,
                $request->input('notes'),
                $actorName
            );

            return response()->json([
                'success' => true,
                'data' => new ReservationResource($reservation),
                'message' => 'Reservation rejected successfully',
            ]);
        } catch (ReservationNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (ReservationStateException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Complete reservation (fulfill the reservation).
     */
    public function completeReservation(int $reservationId, CompleteReservationRequest $request): JsonResponse
    {
        try {
            $actorName = (string) ($request->user()?->name ?? 'System');

            $reservation = $this->reservationService->completeReservation(
                $reservationId,
                $actorName
            );

            return response()->json([
                'success' => true,
                'data' => new ReservationResource($reservation),
                'message' => 'Reservation completed successfully',
            ]);
        } catch (ReservationNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (ReservationStateException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Cancel reservation.
     */
    public function cancelReservation(int $reservationId, CancelReservationRequest $request): JsonResponse
    {
        try {
            $actorName = (string) ($request->user()?->name ?? 'System');

            $reservation = $this->reservationService->cancelReservation(
                $reservationId,
                $request->input('reason'),
                $actorName
            );

            return response()->json([
                'success' => true,
                'data' => new ReservationResource($reservation),
                'message' => 'Reservation cancelled successfully',
            ]);
        } catch (ReservationNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (ReservationStateException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get active reservations summary for dashboard.
     */
    public function getActiveReservationsSummary(): JsonResponse
    {
        try {
            $summary = $this->reservationService->getActiveReservationsSummary();

            return response()->json([
                'success' => true,
                'data' => $summary,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reserve multiple parts for a single job order.
     */
    public function reserveMultiplePartsForJob(ReserveMultiplePartsRequest $request): JsonResponse
    {
        try {
            $actorName = (string) ($request->user()?->name ?? 'System');

            $result = $this->reservationService->reserveMultiplePartsForJob(
                $request->input('items'),
                $request->input('job_order_number'),
                $request->input('notes'),
                $actorName
            );

            $statusCode = $result['success'] ? 201 : 207; // 207 Multi-Status for partial success

            return response()->json([
                'success' => $result['success'],
                'data' => ReservationResource::collection($result['reservations']),
                'failed' => $result['failed'],
                'message' => $result['message'],
            ], $statusCode);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create multiple reservations: '.$e->getMessage(),
            ], 500);
        }
    }
}
