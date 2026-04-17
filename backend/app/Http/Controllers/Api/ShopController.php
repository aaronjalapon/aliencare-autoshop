<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Services\XenditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShopController extends Controller
{
    /**
     * Customer shop checkout — creates a CustomerTransaction and returns a Xendit payment URL.
     *
     * Request body:
     *   amount  numeric  required  Total cart amount
     *   notes   string   optional  Order description (e.g. "Shop Order: Oil x2, Filter x1")
     */
    public function checkout(Request $request, XenditService $xenditService): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $customer = Customer::where('email', $request->user()->email)->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer profile not found.',
            ], 404);
        }

        DB::beginTransaction();
        try {
            $transaction = CustomerTransaction::create([
                'customer_id' => $customer->id,
                'job_order_id' => null,
                'type' => 'invoice',
                'amount' => $validated['amount'],
                'notes' => $validated['notes'] ?? 'Shop Order',
            ]);

            $paymentUrl = $xenditService->createInvoice($transaction, $customer);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'transaction_id' => $transaction->id,
                    'payment_url' => $paymentUrl,
                ],
            ], 201);
        } catch (PaymentGatewayException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'error' => $e->getErrorCode(),
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Checkout failed. Please try again.',
            ], 500);
        }
    }

    /**
     * Customer shop "pay at shop" — creates a pending CustomerTransaction (no Xendit).
     * The full amount appears in the customer's Billing & Payment as a pending invoice.
     *
     * Request body:
     *   amount  numeric  required  Total cart amount
     *   notes   string   optional  Order description
     */
    public function payAtShop(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $customer = Customer::where('email', $request->user()->email)->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer profile not found.',
            ], 404);
        }

        $transaction = CustomerTransaction::create([
            'customer_id' => $customer->id,
            'job_order_id' => null,
            'type' => 'invoice',
            'amount' => $validated['amount'],
            'notes' => $validated['notes'] ?? 'Shop Order (pay at shop)',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'transaction_id' => $transaction->id,
            ],
            'message' => 'Order placed. Payment is due at the shop.',
        ], 201);
    }
}
