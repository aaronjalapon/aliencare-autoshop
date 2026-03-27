<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Repositories\InventoryRepositoryInterface;
use App\Contracts\Services\AlertServiceInterface;
use App\Contracts\Services\InventoryServiceInterface;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InventoryNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Inventory\AddStockRequest;
use App\Http\Requests\Api\Inventory\DeductStockRequest;
use App\Http\Requests\Api\Inventory\LogReturnDamageRequest;
use App\Http\Requests\Api\Inventory\StoreInventoryRequest;
use App\Http\Requests\Api\Inventory\UpdateInventoryRequest;
use App\Http\Resources\InventoryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InventoryController extends Controller
{
    public function __construct(
        private InventoryRepositoryInterface $inventoryRepository,
        private InventoryServiceInterface $inventoryService,
        private AlertServiceInterface $alertService
    ) {}

    /**
     * Display a listing of inventory items.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'category' => $request->input('category'),
            'low_stock' => $request->boolean('low_stock'),
            'search' => $request->input('search'),
        ];

        // Remove null values
        $filters = array_filter($filters, fn ($value) => $value !== null && $value !== false);

        $inventories = $this->inventoryRepository->all(
            $filters,
            (int) $request->get('per_page', 15)
        );

        return response()->json([
            'success' => true,
            'data' => InventoryResource::collection($inventories)->response()->getData(),
        ]);
    }

    /**
     * Store a newly created inventory item.
     */
    public function store(StoreInventoryRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $initialStock = $data['stock'] ?? 0;

            // Create inventory with stock = 0
            $data['stock'] = 0;
            $inventory = $this->inventoryRepository->create($data);

            // Add initial stock using service if any
            if ($initialStock > 0) {
                $result = $this->inventoryService->adjustStock(
                    (string) $inventory->item_id,
                    $initialStock,
                    'procurement',
                    'INITIAL_STOCK',
                    'Initial stock entry',
                    Auth::check() ? Auth::user()->name : 'System'
                );
                $inventory = $result['inventory'];
            }

            return response()->json([
                'success' => true,
                'data' => new InventoryResource($inventory),
                'message' => 'Inventory item created successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create inventory item: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified inventory item.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $inventory = $this->inventoryRepository->findByIdOrFail($id);

            return response()->json([
                'success' => true,
                'data' => new InventoryResource($inventory->load(['reservations', 'stockTransactions'])),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory item not found',
            ], 404);
        }
    }

    /**
     * Update the specified inventory item.
     */
    public function update(UpdateInventoryRequest $request, int $id): JsonResponse
    {
        try {
            $inventory = $this->inventoryRepository->update($id, $request->validated());

            return response()->json([
                'success' => true,
                'data' => new InventoryResource($inventory),
                'message' => 'Inventory item updated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update inventory item: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified inventory item (soft delete by setting status to discontinued).
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->inventoryRepository->delete($id);

            return response()->json([
                'success' => true,
                'message' => 'Inventory item discontinued successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to discontinue inventory item: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check stock levels for a specific item.
     */
    public function checkStockLevels(int $itemId, Request $request): JsonResponse
    {
        try {
            $requestedQuantity = (int) $request->get('requested_quantity', 1);

            $status = $this->inventoryService->checkStockStatus(
                (string) $itemId,
                $requestedQuantity
            );

            return response()->json([
                'success' => true,
                'data' => $status,
            ]);
        } catch (InventoryNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Add stock to inventory (procurement).
     */
    public function addStock(AddStockRequest $request): JsonResponse
    {
        try {
            $result = $this->inventoryService->adjustStock(
                $request->input('item_id'),
                (int) $request->input('quantity'),
                'procurement',
                $request->input('reference_number'),
                $request->input('notes'),
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'inventory' => new InventoryResource($result['inventory']),
                    'transaction' => $result['transaction'],
                    'previous_stock' => $result['previous_stock'],
                    'new_stock' => $result['new_stock'],
                ],
                'message' => 'Stock added successfully',
            ]);
        } catch (InventoryNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add stock: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Deduct stock from inventory (sale).
     */
    public function deductStock(DeductStockRequest $request): JsonResponse
    {
        try {
            $result = $this->inventoryService->adjustStock(
                $request->input('item_id'),
                -(int) $request->input('quantity'), // Negative for deduction
                'sale',
                $request->input('reference_number'),
                $request->input('notes'),
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'inventory' => new InventoryResource($result['inventory']),
                    'transaction' => $result['transaction'],
                    'previous_stock' => $result['previous_stock'],
                    'new_stock' => $result['new_stock'],
                ],
                'message' => 'Stock deducted successfully',
            ]);
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to deduct stock: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Log return or damage transaction.
     */
    public function logReturnDamage(LogReturnDamageRequest $request): JsonResponse
    {
        try {
            $transactionType = $request->input('transaction_type');
            $quantity = (int) $request->input('quantity');

            // For returns, quantity is positive; for damage, it's negative
            $adjustmentQuantity = $transactionType === 'return' ? $quantity : -$quantity;

            $result = $this->inventoryService->adjustStock(
                $request->input('item_id'),
                $adjustmentQuantity,
                $transactionType,
                $request->input('reference_number'),
                $request->input('notes'),
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'inventory' => new InventoryResource($result['inventory']),
                    'transaction' => $result['transaction'],
                    'previous_stock' => $result['previous_stock'],
                    'new_stock' => $result['new_stock'],
                ],
                'message' => ucfirst($transactionType) . ' logged successfully',
            ]);
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
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to log transaction: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate low stock alerts.
     */
    public function generateLowStockAlerts(): JsonResponse
    {
        try {
            $result = $this->alertService->generateLowStockAlerts();

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => "Generated {$result['created']} new alerts, updated {$result['updated']} existing alerts",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate alerts: ' . $e->getMessage(),
            ], 500);
        }
    }
}
