<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Exception thrown when an alert is not found.
 */
class AlertNotFoundException extends Exception
{
    /**
     * The alert ID that was not found.
     */
    protected int $alertId;

    /**
     * Create a new exception instance.
     *
     * @param  int  $alertId  The alert ID that was not found
     * @param  string|null  $message  Custom error message
     * @param  int  $code  HTTP status code
     * @param  \Throwable|null  $previous  Previous exception
     */
    public function __construct(
        int $alertId,
        ?string $message = null,
        int $code = 404,
        ?\Throwable $previous = null
    ) {
        $this->alertId = $alertId;
        $message = $message ?? "Alert not found: {$alertId}";

        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the alert ID that was not found.
     */
    public function getAlertId(): int
    {
        return $this->alertId;
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
            'error' => 'alert_not_found',
            'message' => $this->getMessage(),
            'alert_id' => $this->alertId,
        ], $this->getStatusCode());
    }
}
