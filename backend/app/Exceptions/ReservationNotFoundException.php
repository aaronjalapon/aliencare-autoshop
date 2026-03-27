<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Exception thrown when a reservation is not found.
 */
class ReservationNotFoundException extends Exception
{
    /**
     * The reservation ID that was not found.
     */
    protected int $reservationId;

    /**
     * Create a new exception instance.
     *
     * @param  int  $reservationId  The reservation ID that was not found
     * @param  string|null  $message  Custom error message
     * @param  int  $code  HTTP status code
     * @param  \Throwable|null  $previous  Previous exception
     */
    public function __construct(
        int $reservationId,
        ?string $message = null,
        int $code = 404,
        ?\Throwable $previous = null
    ) {
        $this->reservationId = $reservationId;
        $message = $message ?? "Reservation not found: {$reservationId}";

        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the reservation ID that was not found.
     */
    public function getReservationId(): int
    {
        return $this->reservationId;
    }

    /**
     * Get the HTTP status code for this exception.
     */
    public function getStatusCode(): int
    {
        return 404;
    }

    /**
     * Render the exception as an HTTP response.
     */
    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'reservation_not_found',
            'message' => $this->getMessage(),
            'reservation_id' => $this->reservationId,
        ], $this->getStatusCode());
    }
}
