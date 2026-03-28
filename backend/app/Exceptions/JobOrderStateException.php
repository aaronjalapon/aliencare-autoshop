<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Exception thrown when a job order state transition is invalid.
 */
class JobOrderStateException extends Exception
{
    protected int $jobOrderId;

    protected string $currentState;

    protected string $targetState;

    public function __construct(
        int $jobOrderId,
        string $currentState,
        string $targetState,
        ?string $message = null,
        int $code = 422,
        ?\Throwable $previous = null
    ) {
        $this->jobOrderId = $jobOrderId;
        $this->currentState = $currentState;
        $this->targetState = $targetState;

        $message = $message ?? "Cannot transition job order {$jobOrderId} from '{$currentState}' to '{$targetState}'";

        parent::__construct($message, $code, $previous);
    }

    public function getJobOrderId(): int
    {
        return $this->jobOrderId;
    }

    public function getCurrentState(): string
    {
        return $this->currentState;
    }

    public function getTargetState(): string
    {
        return $this->targetState;
    }

    public function getStatusCode(): int
    {
        return 422;
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'invalid_job_order_state',
            'message' => $this->getMessage(),
            'job_order_id' => $this->jobOrderId,
            'current_state' => $this->currentState,
            'target_state' => $this->targetState,
        ], $this->getStatusCode());
    }
}
