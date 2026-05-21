<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\InvoiceStatus;
use App\Events\BillingTransactionUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Invoice\UpdateInvoiceRequest;
use App\Http\Resources\CustomerTransactionResource;
use App\Models\CustomerTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('manage-job-orders');

        $query = CustomerTransaction::query()
            ->where('type', 'invoice')
            ->with(['customer', 'jobOrder'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);

        return response()->json([
            'success' => true,
            'data' => CustomerTransactionResource::collection($query->paginate($perPage)),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        Gate::authorize('manage-job-orders');

        $transaction = CustomerTransaction::with(['customer', 'jobOrder.items'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new CustomerTransactionResource($transaction),
        ]);
    }

    public function update(UpdateInvoiceRequest $request, int $id): JsonResponse
    {
        Gate::authorize('manage-job-orders');

        $transaction = CustomerTransaction::findOrFail($id);

        if ($transaction->status !== InvoiceStatus::Draft) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft invoices can be updated.',
            ], 422);
        }

        $oldData = $transaction->only(['status', 'amount', 'notes']);

        $transaction->update($request->validated());

        event(new BillingTransactionUpdated(
            $transaction->fresh(),
            'invoice_updated',
            $oldData,
            $transaction->only(['status', 'amount', 'notes']),
            now(),
        ));

        return response()->json([
            'success' => true,
            'data' => new CustomerTransactionResource($transaction->fresh(['customer', 'jobOrder'])),
            'message' => 'Invoice updated successfully.',
        ]);
    }

    public function issue(int $id): JsonResponse
    {
        Gate::authorize('manage-job-orders');

        $transaction = CustomerTransaction::findOrFail($id);

        if ($transaction->status !== InvoiceStatus::Draft) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft invoices can be issued.',
            ], 422);
        }

        $oldData = $transaction->only(['status']);

        $transaction->update(['status' => InvoiceStatus::Issued]);

        event(new BillingTransactionUpdated(
            $transaction->fresh(),
            'invoice_issued',
            $oldData,
            $transaction->only(['status']),
            now(),
        ));

        return response()->json([
            'success' => true,
            'data' => new CustomerTransactionResource($transaction->fresh(['customer', 'jobOrder'])),
            'message' => 'Invoice issued successfully.',
        ]);
    }

    public function void(int $id): JsonResponse
    {
        Gate::authorize('manage-job-orders');

        $transaction = CustomerTransaction::with('jobOrder')->findOrFail($id);

        if ($transaction->status === InvoiceStatus::Void) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice is already voided.',
            ], 422);
        }

        // Prevent voiding if the invoice has been paid (via xendit)
        if ($transaction->xendit_status === 'PAID' || $transaction->paid_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot void an invoice that has been paid.',
            ], 422);
        }

        $oldData = $transaction->only(['status']);

        $transaction->update(['status' => InvoiceStatus::Void]);

        event(new BillingTransactionUpdated(
            $transaction->fresh(),
            'invoice_voided',
            $oldData,
            $transaction->only(['status']),
            now(),
        ));

        return response()->json([
            'success' => true,
            'data' => new CustomerTransactionResource($transaction->fresh(['customer', 'jobOrder'])),
            'message' => 'Invoice voided successfully.',
        ]);
    }
}
