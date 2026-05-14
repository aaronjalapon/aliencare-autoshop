<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\CustomerTransactionType;
use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Services\XenditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Create a Xendit hosted invoice for a pending transaction.
     * Returns the payment URL the customer should be redirected to.
     */
    public function createInvoice(Request $request, int $transactionId, XenditService $xenditService): JsonResponse
    {
        $transaction = CustomerTransaction::findOrFail($transactionId);
        $transactionType = $transaction->type?->value ?? (string) $transaction->type;

        // Billing page can retry both invoice and reservation_fee transactions.
        if (! in_array($transactionType, [CustomerTransactionType::Invoice->value, CustomerTransactionType::ReservationFee->value], true)) {
            return $this->errorResponse('Only invoice and reservation-fee transactions can be paid.', 422);
        }

        if ($transaction->xendit_status === 'PAID') {
            return $this->errorResponse('This transaction has already been paid.', 422);
        }

        // Ensure the authenticated user owns this transaction
        $customer = Customer::where('email', $request->user()->email)->firstOrFail();

        if ($transaction->customer_id !== $customer->id) {
            return $this->errorResponse('Forbidden.', 403);
        }

        // If a valid pending invoice already exists, return the existing URL
        if ($transaction->payment_url && $transaction->xendit_status === 'PENDING') {
            return response()->json([
                'success' => true,
                'data' => ['payment_url' => $transaction->payment_url],
            ]);
        }

        try {
            $paymentUrl = $xenditService->createInvoice($transaction, $customer);
        } catch (PaymentGatewayException $e) {
            return $this->paymentGatewayErrorResponse($e);
        }

        return response()->json([
            'success' => true,
            'data' => ['payment_url' => $paymentUrl],
        ]);
    }

    /**
     * Create a single Xendit invoice that covers ALL pending transactions
     * for the authenticated customer, allowing the total balance to be paid at once.
     */
    public function createBulkInvoice(Request $request, XenditService $xenditService): JsonResponse
    {
        $customer = Customer::where('email', $request->user()->email)->firstOrFail();

        $pendingTransactions = CustomerTransaction::where('customer_id', $customer->id)
            ->whereIn('type', [CustomerTransactionType::Invoice->value, CustomerTransactionType::ReservationFee->value])
            ->where(function ($q) {
                $q->whereNull('xendit_status')
                    ->orWhere('xendit_status', '!=', 'PAID');
            })
            ->get();

        if ($pendingTransactions->isEmpty()) {
            return $this->errorResponse('No pending transactions to pay.', 422);
        }

        // If all transactions already share a pending batch invoice, return the existing URL
        $existingBatchId = $pendingTransactions->first()->batch_external_id;
        if ($existingBatchId
            && $pendingTransactions->every(fn ($t) => $t->batch_external_id === $existingBatchId && $t->xendit_status === 'PENDING')
        ) {
            return response()->json([
                'success' => true,
                'data' => [
                    'payment_url' => $pendingTransactions->first()->payment_url,
                    'transaction_count' => $pendingTransactions->count(),
                    'total_amount' => (float) $pendingTransactions->sum('amount'),
                ],
            ]);
        }

        try {
            $paymentUrl = $xenditService->createBulkInvoice($pendingTransactions, $customer);
        } catch (PaymentGatewayException $e) {
            return $this->paymentGatewayErrorResponse($e);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'payment_url' => $paymentUrl,
                'transaction_count' => $pendingTransactions->count(),
                'total_amount' => (float) $pendingTransactions->sum('amount'),
            ],
        ]);
    }

    private function errorResponse(string $message, int $status): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status);
    }

    private function paymentGatewayErrorResponse(PaymentGatewayException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => $e->getErrorCode(),
            'message' => $e->getMessage(),
        ], $e->getStatusCode());
    }

    /**
     * Sync invoice transaction statuses by querying the Xendit API directly.
     * This handles cases where the webhook hasn't arrived yet (e.g. redirect
     * races, dev environments, or network delays), and can also backfill
     * missing payment methods for already-paid transactions.
     */
    public function syncStatuses(Request $request, XenditService $xenditService): JsonResponse
    {
        $customer = Customer::where('email', $request->user()->email)->firstOrFail();

        $syncCandidates = CustomerTransaction::where('customer_id', $customer->id)
            ->whereNotNull('xendit_invoice_id')
            ->where(function ($q) {
                $q->whereNull('xendit_status')
                    ->orWhere('xendit_status', 'PENDING')
                    ->orWhere(function ($paidBackfillQuery) {
                        $paidBackfillQuery->where('xendit_status', 'PAID')
                            ->whereNull('payment_method');
                    });
            })
            ->get();

        $updatedCount = 0;

        foreach ($syncCandidates as $transaction) {
            $invoiceSnapshot = $xenditService->getInvoiceSnapshot($transaction->xendit_invoice_id);

            if (! $invoiceSnapshot) {
                continue;
            }

            $status = $invoiceSnapshot['status'] ?? null;

            if (! is_string($status) || trim($status) === '') {
                continue;
            }

            $paymentMethod = $invoiceSnapshot['payment_method'] ?? null;
            $normalizedStatus = trim($status);
            $normalizedPaymentMethod = is_string($paymentMethod) && trim($paymentMethod) !== ''
                ? trim($paymentMethod)
                : null;

            $previousStatus = $transaction->xendit_status;
            $statusChanged = $normalizedStatus !== ($previousStatus ?? '');
            $paymentMethodChanged = $normalizedPaymentMethod !== null && $normalizedPaymentMethod !== $transaction->payment_method;

            if (! $statusChanged && ! $paymentMethodChanged) {
                continue;
            }

            $updateData = [];

            if ($statusChanged) {
                $updateData['xendit_status'] = $normalizedStatus;
                $updateData['paid_at'] = $normalizedStatus === 'PAID' ? now() : $transaction->paid_at;
            }

            if ($paymentMethodChanged) {
                $updateData['payment_method'] = $normalizedPaymentMethod;
            }

            $transaction->update($updateData);

            if ($statusChanged && $normalizedStatus === 'PAID') {
                $this->createRemainingBalanceTransaction($transaction);
                $this->settleJobOrderIfFullyPaid($transaction);
            }

            $updatedCount++;
        }

        return response()->json([
            'success' => true,
            'data' => ['updated_count' => $updatedCount],
        ]);
    }

    /**
     * Handle Xendit payment webhook callbacks.
     * Validates the callback token and updates the transaction status.
     * This route is public (no auth) but secured via the X-CALLBACK-TOKEN header.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $expectedToken = (string) config('xendit.webhook_token');

        if (trim($expectedToken) === '') {
            Log::error('Xendit webhook rejected: expected callback token is not configured.');

            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $callbackToken = $request->header('x-callback-token');

        if (! is_string($callbackToken) || trim($callbackToken) === '') {
            Log::warning('Xendit webhook rejected: missing callback token header.');

            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (! hash_equals($expectedToken, $callbackToken)) {
            Log::warning('Xendit webhook: invalid callback token.');

            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $payload = $request->all();
        $externalId = $payload['external_id'] ?? null;
        $status = $payload['status'] ?? null;

        if (! $externalId || ! $status) {
            return response()->json(['message' => 'Invalid payload.'], 400);
        }

        // 1. Try single-transaction lookup (existing behaviour)
        $transaction = CustomerTransaction::where('external_id', $externalId)->first();

        if ($transaction) {
            $transaction->update([
                'xendit_status' => $status,
                'payment_method' => $payload['payment_method'] ?? $transaction->payment_method,
                'paid_at' => $status === 'PAID' ? now() : $transaction->paid_at,
            ]);

            if ($status === 'PAID') {
                if ($transaction->reservation_id) {
                    Log::info('Xendit webhook: reservation fee paid for reservation '.$transaction->reservation_id);
                }

                $this->createRemainingBalanceTransaction($transaction);
                $this->settleJobOrderIfFullyPaid($transaction);
            }

            Log::info('Xendit webhook: transaction '.$transaction->id.' status updated to '.$status);

            return response()->json(['message' => 'OK']);
        }

        // 2. Try batch lookup — a pay-all invoice uses batch_external_id
        $batchTransactions = CustomerTransaction::where('batch_external_id', $externalId)->get();

        if ($batchTransactions->isEmpty()) {
            Log::info('Xendit webhook: unknown external_id '.$externalId);

            return response()->json(['message' => 'OK']);
        }

        $updateData = [
            'xendit_status' => $status,
            'payment_method' => $payload['payment_method'] ?? null,
            'paid_at' => $status === 'PAID' ? now() : null,
        ];

        foreach ($batchTransactions as $bt) {
            $bt->update([
                'xendit_status' => $updateData['xendit_status'],
                'payment_method' => $updateData['payment_method'] ?? $bt->payment_method,
                'paid_at' => $updateData['paid_at'] ?? $bt->paid_at,
            ]);

            if ($status === 'PAID') {
                if ($bt->reservation_id) {
                    Log::info('Xendit webhook: reservation fee paid for reservation '.$bt->reservation_id);
                }

                $this->createRemainingBalanceTransaction($bt);
                $this->settleJobOrderIfFullyPaid($bt);
            }
        }

        Log::info('Xendit webhook: batch '.$externalId.' ('.$batchTransactions->count().' transactions) status updated to '.$status);

        return response()->json(['message' => 'OK']);
    }

    // ── Frontdesk endpoints ──────────────────────────────────────────────

    /**
     * Create a Xendit hosted invoice from the frontdesk (billing/POS).
     * Not scoped to the authenticated customer — staff can generate
     * payment links for any customer.
     */
    public function createFrontdeskInvoice(Request $request, XenditService $xenditService): JsonResponse
    {
        Gate::authorize('manage-pos');

        $transactionId = $request->input('transaction_id');

        if ($transactionId) {
            $transaction = CustomerTransaction::findOrFail($transactionId);
            $transactionType = $transaction->type?->value ?? (string) $transaction->type;

            if (! in_array($transactionType, [CustomerTransactionType::Invoice->value, CustomerTransactionType::ReservationFee->value], true)) {
                return $this->errorResponse('Only invoice and reservation-fee transactions can be paid via Xendit.', 422);
            }

            if ($transaction->xendit_status === 'PAID') {
                return $this->errorResponse('This transaction has already been paid.', 422);
            }

            // Reuse existing pending invoice
            if ($transaction->payment_url && $transaction->xendit_status === 'PENDING') {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment_url' => $transaction->payment_url,
                        'transaction_id' => $transaction->id,
                        'xendit_invoice_id' => $transaction->xendit_invoice_id,
                    ],
                ]);
            }
        } else {
            // Create a new Invoice transaction inline
            $validated = $request->validate([
                'customer_id' => ['required', 'integer', 'exists:customers,id'],
                'amount' => ['required', 'numeric', 'min:0.01'],
                'job_order_id' => ['nullable', 'integer', 'exists:job_orders,id'],
                'payment_method' => ['nullable', 'string', 'max:50'],
                'reference_number' => ['nullable', 'string', 'max:100'],
                'notes' => ['nullable', 'string', 'max:500'],
            ]);

            $transaction = CustomerTransaction::create([
                'customer_id' => (int) $validated['customer_id'],
                'job_order_id' => $validated['job_order_id'] ?? null,
                'type' => CustomerTransactionType::Invoice,
                'amount' => (float) $validated['amount'],
                'payment_method' => $validated['payment_method'] ?? null,
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? 'Frontdesk online payment invoice',
            ]);
        }

        $customer = Customer::findOrFail($transaction->customer_id);

        try {
            $paymentUrl = $xenditService->createInvoice($transaction, $customer);
        } catch (PaymentGatewayException $e) {
            return $this->paymentGatewayErrorResponse($e);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'payment_url' => $paymentUrl,
                'transaction_id' => $transaction->id,
                'xendit_invoice_id' => $transaction->fresh()->xendit_invoice_id,
            ],
            'message' => 'Xendit payment link generated.',
        ]);
    }

    /**
     * Record an in-person payment (cash/card) from the frontdesk.
     * Creates a Payment transaction and auto-settles the job order if fully paid.
     */
    public function recordPayment(Request $request): JsonResponse
    {
        Gate::authorize('manage-pos');

        $validated = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'job_order_id' => ['nullable', 'integer', 'exists:job_orders,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'max:50'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $transaction = CustomerTransaction::create([
            'customer_id' => (int) $validated['customer_id'],
            'job_order_id' => $validated['job_order_id'] ?? null,
            'type' => CustomerTransactionType::Payment,
            'amount' => (float) $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'reference_number' => $validated['reference_number'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'xendit_status' => null,
            'paid_at' => now(),
        ]);

        $settled = false;
        if ($validated['job_order_id'] ?? null) {
            $this->settleJobOrderIfFullyPaid($transaction);
            $jobOrder = JobOrder::find($validated['job_order_id']);
            $settled = $jobOrder?->settled_flag ?? false;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'transaction' => new \App\Http\Resources\CustomerTransactionResource($transaction),
                'settled' => $settled,
            ],
            'message' => $settled
                ? 'Payment recorded and job order settled.'
                : 'Payment recorded successfully.',
        ], 201);
    }

    /**
     * Sync a single transaction's Xendit invoice status from the frontdesk.
     * Useful when the customer confirms payment but the webhook hasn't arrived yet.
     */
    public function syncFrontdeskStatus(Request $request, XenditService $xenditService): JsonResponse
    {
        Gate::authorize('manage-pos');

        $validated = $request->validate([
            'transaction_id' => ['required', 'integer', 'exists:customer_transactions,id'],
        ]);

        $transaction = CustomerTransaction::findOrFail($validated['transaction_id']);

        if (! $transaction->xendit_invoice_id) {
            return $this->errorResponse('This transaction has no Xendit invoice to sync.', 422);
        }

        $snapshot = $xenditService->getInvoiceSnapshot($transaction->xendit_invoice_id);

        if (! $snapshot) {
            return $this->errorResponse('Unable to fetch invoice status from Xendit.', 502);
        }

        $status = $snapshot['status'] ?? null;
        $paymentMethod = $snapshot['payment_method'] ?? null;

        if (! is_string($status) || trim($status) === '') {
            return $this->errorResponse('Invalid response from Xendit.', 502);
        }

        $normalizedStatus = trim($status);
        $previousStatus = $transaction->xendit_status;

        $transaction->update([
            'xendit_status' => $normalizedStatus,
            'payment_method' => is_string($paymentMethod) && trim($paymentMethod) !== ''
                ? trim($paymentMethod)
                : $transaction->payment_method,
            'paid_at' => $normalizedStatus === 'PAID' ? now() : $transaction->paid_at,
        ]);

        if ($normalizedStatus === 'PAID' && $previousStatus !== 'PAID') {
            $this->createRemainingBalanceTransaction($transaction);
            $this->settleJobOrderIfFullyPaid($transaction);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'transaction' => new \App\Http\Resources\CustomerTransactionResource($transaction->fresh()),
                'status_changed' => $normalizedStatus !== ($previousStatus ?? ''),
                'xendit_status' => $normalizedStatus,
            ],
            'message' => $normalizedStatus === 'PAID'
                ? 'Payment confirmed. Status synced from Xendit.'
                : 'Status synced from Xendit.',
        ]);
    }

    /**
     * After a reservation fee is paid, create a pending invoice for the
     * remaining service balance (total service cost minus the reservation fee).
     */
    private function createRemainingBalanceTransaction(CustomerTransaction $transaction): void
    {
        if (! $transaction->job_order_id) {
            return;
        }

        // Only act on reservation-fee invoice transactions
        $notes = (string) $transaction->notes;
        if (! str_starts_with($notes, 'Reservation fee for booking')) {
            return;
        }

        $jobOrder = JobOrder::find($transaction->job_order_id);

        if (! $jobOrder) {
            return;
        }

        $serviceFee = (float) $jobOrder->service_fee;
        $paidAmount = (float) $transaction->amount;
        $remaining = round($serviceFee - $paidAmount, 2);

        if ($remaining <= 0) {
            return;
        }

        // Guard against duplicates (webhook retries)
        $alreadyExists = CustomerTransaction::where('job_order_id', $jobOrder->id)
            ->where('type', CustomerTransactionType::Invoice->value)
            ->where('id', '!=', $transaction->id)
            ->where(function ($q) {
                $q->whereNull('xendit_status')
                    ->orWhere('xendit_status', '!=', 'PAID');
            })
            ->exists();

        if ($alreadyExists) {
            return;
        }

        CustomerTransaction::create([
            'customer_id' => $transaction->customer_id,
            'job_order_id' => $jobOrder->id,
            'type' => CustomerTransactionType::Invoice,
            'amount' => $remaining,
            'notes' => 'Remaining balance for '.$jobOrder->jo_number.' (reservation fee of ₱'.number_format($paidAmount, 2).' deducted)',
        ]);

        Log::info('Xendit webhook: created remaining balance transaction of ₱'.number_format($remaining, 2).' for job order '.$jobOrder->id);
    }

    /**
     * If the paid transaction belongs to a job order:
     * 1. Auto-approve the job order if it's still pending_approval.
     * 2. If all transactions for that job order are now PAID, mark as settled.
     */
    private function settleJobOrderIfFullyPaid(CustomerTransaction $transaction): void
    {
        if (! $transaction->job_order_id) {
            return;
        }

        $jobOrder = JobOrder::find($transaction->job_order_id);

        if (! $jobOrder) {
            return;
        }

        // Auto-approve if the job order is still pending_approval
        if ($jobOrder->status?->value === 'pending_approval') {
            $jobOrder->update([
                'status' => 'approved',
                'approved_at' => now(),
            ]);
            Log::info('Payment webhook: job order '.$jobOrder->id.' auto-approved after payment confirmation.');
        }

        if ($jobOrder->settled_flag) {
            return;
        }

        $hasPending = CustomerTransaction::where('job_order_id', $jobOrder->id)
            ->whereIn('type', [CustomerTransactionType::Invoice->value, CustomerTransactionType::ReservationFee->value])
            ->where(function ($q) {
                $q->whereNull('xendit_status')
                    ->orWhere('xendit_status', '!=', 'PAID');
            })
            ->exists();

        if (! $hasPending) {
            $jobOrder->update(['settled_flag' => true]);
            Log::info('Payment webhook: job order '.$jobOrder->id.' fully settled.');
        }
    }
}
