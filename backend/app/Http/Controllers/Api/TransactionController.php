<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Transaction\TransactionIndexRequest;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Controller for stock transaction history and auditing.
 */
class TransactionController extends Controller
{
    /**
     * Get a paginated list of stock transactions with optional filtering.
     */
    public function index(TransactionIndexRequest $request): JsonResponse
    {
        Gate::authorize('view-transactions');

        $query = StockTransaction::with('inventory');
        $filters = $request->validated();

        if (isset($filters['item_id'])) {
            $query->where('item_id', $filters['item_id']);
        }

        if (isset($filters['transaction_type'])) {
            $query->where('transaction_type', $filters['transaction_type']);
        }

        if (isset($filters['start_date'], $filters['end_date'])) {
            $query->whereBetween('created_at', [
                $filters['start_date'],
                $filters['end_date'],
            ]);
        }

        $transactions = $query->orderBy('created_at', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 15));

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    /**
     * Get a specific stock transaction by ID.
     */
    public function show(int $id): JsonResponse
    {
        Gate::authorize('view-transactions');

        $transaction = StockTransaction::with('inventory')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $transaction,
        ]);
    }
}
