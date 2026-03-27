<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Exception thrown when a reservation state transition is invalid.
 */
class ReservationStateException extends Exception
{
    /**
     * The reservation ID.
     */
    protected int $reservationId;

    /**
     * The current state of the reservation.
     */
    protected string $currentState;

    /**
     * The attempted target state.
     */
    protected string $targetState;

    /**
     * Create a new exception instance.
     *
     * @param  int  $reservationId  The reservation ID
     * @param  string  $currentState  The current state
     * @param  string  $targetState  The attempted target state
     * @param  string|null  $message  Custom error message
     * @param  int  $code  HTTP status code
     * @param  \Throwable|null  $previous  Previous exception
     */
    public function __construct(
        int $reservationId,
        string $currentState,
        string $targetState,
        ?string $message = null,
        int $code = 422,
        ?\Throwable $previous = null
    ) {
        $this->reservationId = $reservationId;
        $this->currentState = $currentState;
        $this->targetState = $targetState;

        $message = $message ?? "Cannot transition reservation {$reservationId} from '{$currentState}' to '{$targetState}'";

        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the reservation ID.
     */
    public function getReservationId(): int
    {
        return $this->reservationId;
    }

    /**
     * Get the current state.
     */
    public function getCurrentState(): string
    {
        return $this->currentState;
    }

    /**
     * Get the target state.
     */
    public function getTargetState(): string
    {
        return $this->targetState;
    }

    /**
     * Get the HTTP status code for this exception.
     */
    public function getStatusCode(): int
    {
        return 422;
    }

    /**
     * Render the exception as an HTTP response.
     */
    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'invalid_reservation_state',
            'message' => $this->getMessage(),
            'reservation_id' => $this->reservationId,
            'current_state' => $this->currentState,
            'target_state' => $this->targetState,
        ], $this->getStatusCode());
    }
}
