<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Exception thrown when a job order is not found.
 */
class JobOrderNotFoundException extends Exception
{
    protected int $jobOrderId;

    public function __construct(
        int $jobOrderId,
        ?string $message = null,
        int $code = 404,
        ?\Throwable $previous = null
    ) {
        $this->jobOrderId = $jobOrderId;
        $message = $message ?? "Job order not found: {$jobOrderId}";

        parent::__construct($message, $code, $previous);
    }

    public function getJobOrderId(): int
    {
        return $this->jobOrderId;
    }

    public function getStatusCode(): int
    {
        return 404;
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'job_order_not_found',
            'message' => $this->getMessage(),
            'job_order_id' => $this->jobOrderId,
        ], $this->getStatusCode());
    }
}
