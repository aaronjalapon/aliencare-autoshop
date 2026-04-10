<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Services\XenditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(private readonly XenditService $xenditService) {}

    /**
     * Create a Xendit hosted invoice for a pending transaction.
     * Returns the payment URL the customer should be redirected to.
     */
    public function createInvoice(Request $request, int $transactionId): JsonResponse
    {
        $transaction = CustomerTransaction::findOrFail($transactionId);

        // Only allow invoices (type=invoice) that are still pending
        if ((string) $transaction->type->value !== 'invoice') {
            return response()->json(['message' => 'Only invoice-type transactions can be paid.'], 422);
        }

        if ($transaction->xendit_status === 'PAID') {
            return response()->json(['message' => 'This transaction has already been paid.'], 422);
        }

        // Ensure the authenticated user owns this transaction
        $customer = Customer::where('email', $request->user()->email)->firstOrFail();

        if ($transaction->customer_id !== $customer->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // If a valid pending invoice already exists, return the existing URL
        if ($transaction->payment_url && $transaction->xendit_status === 'PENDING') {
            return response()->json([
                'success' => true,
                'data' => ['payment_url' => $transaction->payment_url],
            ]);
        }

        $paymentUrl = $this->xenditService->createInvoice($transaction, $customer);

        return response()->json([
            'success' => true,
            'data' => ['payment_url' => $paymentUrl],
        ]);
    }

    /**
     * Handle Xendit payment webhook callbacks.
     * Validates the callback token and updates the transaction status.
     * This route is public (no auth) but secured via the X-CALLBACK-TOKEN header.
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $callbackToken = $request->header('x-callback-token');
        $expectedToken = (string) config('xendit.webhook_token');

        if (! hash_equals($expectedToken, (string) $callbackToken)) {
            Log::warning('Xendit webhook: invalid callback token.');

            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $payload = $request->all();
        $externalId = $payload['external_id'] ?? null;
        $status = $payload['status'] ?? null;

        if (! $externalId || ! $status) {
            return response()->json(['message' => 'Invalid payload.'], 400);
        }

        $transaction = CustomerTransaction::where('external_id', $externalId)->first();

        if (! $transaction) {
            // Unknown transaction — return 200 so Xendit stops retrying
            Log::info('Xendit webhook: unknown external_id '.$externalId);

            return response()->json(['message' => 'OK']);
        }

        $transaction->update([
            'xendit_status' => $status,
            'payment_method' => $payload['payment_method'] ?? $transaction->payment_method,
            'paid_at' => $status === 'PAID' ? now() : $transaction->paid_at,
        ]);

        // If this transaction is linked to a reservation, log a payment confirmation
        if ($status === 'PAID' && $transaction->reservation_id) {
            Log::info('Xendit webhook: reservation fee paid for reservation '.$transaction->reservation_id);
        }

        Log::info('Xendit webhook: transaction '.$transaction->id.' status updated to '.$status);

        return response()->json(['message' => 'OK']);
    }
}
