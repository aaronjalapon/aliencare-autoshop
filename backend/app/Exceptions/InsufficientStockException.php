<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Exception thrown when there is insufficient stock for an operation.
 */
class InsufficientStockException extends Exception
{
    /**
     * The item ID with insufficient stock.
     */
    protected string $itemId;

    /**
     * The available stock quantity.
     */
    protected int $availableStock;

    /**
     * The requested quantity.
     */
    protected int $requestedQuantity;

    /**
     * Create a new exception instance.
     *
     * @param  string  $itemId  The item ID
     * @param  int  $availableStock  Available stock quantity
     * @param  int  $requestedQuantity  Requested quantity
     * @param  string|null  $message  Custom error message
     * @param  int  $code  HTTP status code
     * @param  \Throwable|null  $previous  Previous exception
     */
    public function __construct(
        string $itemId,
        int $availableStock,
        int $requestedQuantity,
        ?string $message = null,
        int $code = 422,
        ?\Throwable $previous = null
    ) {
        $this->itemId = $itemId;
        $this->availableStock = $availableStock;
        $this->requestedQuantity = $requestedQuantity;

        $message = $message ?? "Insufficient stock for item {$itemId}. Available: {$availableStock}, Requested: {$requestedQuantity}";

        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the item ID.
     */
    public function getItemId(): string
    {
        return $this->itemId;
    }

    /**
     * Get the available stock.
     */
    public function getAvailableStock(): int
    {
        return $this->availableStock;
    }

    /**
     * Get the requested quantity.
     */
    public function getRequestedQuantity(): int
    {
        return $this->requestedQuantity;
    }

    /**
     * Get the shortfall (how much is missing).
     */
    public function getShortfall(): int
    {
        return $this->requestedQuantity - $this->availableStock;
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
    public function render(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'insufficient_stock',
            'message' => $this->getMessage(),
            'item_id' => $this->itemId,
            'available_stock' => $this->availableStock,
            'requested_quantity' => $this->requestedQuantity,
            'shortfall' => $this->getShortfall(),
        ], $this->getStatusCode());
    }
}
