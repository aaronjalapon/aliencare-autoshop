<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class PaymentGatewayException extends Exception
{
    public function __construct(
        ?string $message = null,
        private readonly string $errorCode = 'payment_gateway_unavailable',
        private readonly int $statusCode = 503,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message ?? 'Online payment is temporarily unavailable. Please try again later.', 0, $previous);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => $this->errorCode,
            'message' => $this->getMessage(),
        ], $this->statusCode);
    }
}