<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Exception thrown when an inventory item is not found.
 */
class InventoryNotFoundException extends Exception
{
    /**
     * The item ID that was not found.
     */
    protected string $itemId;

    /**
     * Create a new exception instance.
     *
     * @param  string  $itemId  The item ID that was not found
     * @param  string|null  $message  Custom error message
     * @param  int  $code  HTTP status code
     * @param  \Throwable|null  $previous  Previous exception
     */
    public function __construct(
        string $itemId,
        ?string $message = null,
        int $code = 404,
        ?\Throwable $previous = null
    ) {
        $this->itemId = $itemId;
        $message = $message ?? "Inventory item not found: {$itemId}";

        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the item ID that was not found.
     */
    public function getItemId(): string
    {
        return $this->itemId;
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
    public function render(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'inventory_not_found',
            'message' => $this->getMessage(),
            'item_id' => $this->itemId,
        ], $this->getStatusCode());
    }
}
