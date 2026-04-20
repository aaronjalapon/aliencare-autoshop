<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\InventoryServiceInterface;
use App\Enums\CustomerTransactionType;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InventoryNotFoundException;
use App\Exceptions\PaymentGatewayException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Pos\PosCheckoutRequest;
use App\Http\Resources\CustomerTransactionResource;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Services\XenditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PosController extends Controller
{
    public function __construct(
        private InventoryServiceInterface $inventoryService
    ) {}

    public function transactions(Request $request): JsonResponse
    {
        Gate::authorize('manage-pos');

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'payment_mode' => ['nullable', 'string', Rule::in(['cash', 'online'])],
            'payment_state' => ['nullable', 'string', Rule::in(['paid', 'pending'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = CustomerTransaction::query()
            ->whereNotNull('reference_number')
            ->where('reference_number', 'like', 'POS-%')
            ->latest('id');

        if (isset($validated['customer_id'])) {
            $query->where('customer_id', (int) $validated['customer_id']);
        }

        if (isset($validated['payment_mode'])) {
            $query->where('payment_method', $validated['payment_mode']);
        }

        if (($validated['payment_state'] ?? null) === 'paid') {
            $query->where('xendit_status', 'PAID');
        }

        if (($validated['payment_state'] ?? null) === 'pending') {
            $query->where(function ($q): void {
                $q->whereNull('xendit_status')
                    ->orWhere('xendit_status', '!=', 'PAID');
            });
        }

        $search = trim((string) ($validated['search'] ?? ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('reference_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $transactions = $query->paginate((int) ($validated['per_page'] ?? 15));

        return response()->json([
            'success' => true,
            'data' => CustomerTransactionResource::collection($transactions)->response()->getData(),
        ]);
    }

    public function checkout(PosCheckoutRequest $request): JsonResponse
    {
        Gate::authorize('manage-pos');

        $validated = $request->validated();

        $customer = Customer::find((int) $validated['customer_id']);
        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found.',
            ], 404);
        }

        /** @var array<int, array{item_id: int, quantity: int}> $cart */
        $cart = $validated['cart'];
        $cartLines = $this->aggregateCartLines($cart);
        $paymentMode = strtolower((string) $validated['payment_mode']);
        $referenceNumber = $this->generateReferenceNumber();
        $operator = (string) ($request->user()?->name ?? 'System');

        DB::beginTransaction();

        try {
            $subtotal = 0.0;
            $itemCount = 0;
            $lineItems = [];

            foreach ($cartLines as $line) {
                $result = $this->inventoryService->adjustStock(
                    itemId: (string) $line['item_id'],
                    quantity: -$line['quantity'],
                    transactionType: 'sale',
                    referenceNumber: $referenceNumber,
                    notes: 'POS checkout',
                    createdBy: $operator,
                );

                $inventory = $result['inventory'];
                $quantity = $line['quantity'];
                $unitPrice = (float) $inventory->unit_price;
                $lineTotal = round($unitPrice * $quantity, 2);

                $subtotal += $lineTotal;
                $itemCount += $quantity;

                $lineItems[] = [
                    'item_id' => $inventory->item_id,
                    'sku' => $inventory->sku,
                    'item_name' => $inventory->item_name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'remaining_stock' => $result['new_stock'],
                ];
            }

            $total = round($subtotal, 2);
            if ($total <= 0) {
                throw new \RuntimeException('Checkout total must be greater than zero.');
            }

            $transaction = CustomerTransaction::create([
                'customer_id' => $customer->id,
                'job_order_id' => null,
                'type' => CustomerTransactionType::Invoice,
                'amount' => $total,
                'reference_number' => $referenceNumber,
                'notes' => $this->buildTransactionNotes(
                    $referenceNumber,
                    $paymentMode,
                    $validated['notes'] ?? null,
                    $lineItems
                ),
                'payment_method' => $paymentMode,
            ]);

            $paymentUrl = null;
            if ($paymentMode === 'online') {
                $xenditService = app()->make(XenditService::class);
                $paymentUrl = $xenditService->createInvoice($transaction, $customer);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'transaction' => new CustomerTransactionResource($transaction->refresh()),
                    'checkout' => [
                        'reference_number' => $referenceNumber,
                        'payment_mode' => $paymentMode,
                        'item_count' => $itemCount,
                        'subtotal' => $total,
                        'total' => $total,
                        'line_items' => $lineItems,
                        'payment_url' => $paymentUrl,
                    ],
                ],
                'message' => $paymentMode === 'online'
                    ? 'POS checkout created. Share the payment URL with the customer.'
                    : 'POS checkout completed. Cash payment recorded.',
            ], 201);
        } catch (InsufficientStockException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (InventoryNotFoundException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        } catch (PaymentGatewayException $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'error' => $e->getErrorCode(),
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (\Throwable) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'POS checkout failed. Please try again.',
            ], 500);
        }
    }

    /**
     * @param  array<int, array{item_id: int, quantity: int}>  $cart
     * @return array<int, array{item_id: int, quantity: int}>
     */
    private function aggregateCartLines(array $cart): array
    {
        /** @var array<int, int> $aggregated */
        $aggregated = [];

        foreach ($cart as $line) {
            $itemId = (int) ($line['item_id'] ?? 0);
            $quantity = (int) ($line['quantity'] ?? 0);

            if ($itemId <= 0 || $quantity <= 0) {
                continue;
            }

            $aggregated[$itemId] = ($aggregated[$itemId] ?? 0) + $quantity;
        }

        ksort($aggregated);

        /** @var array<int, array{item_id: int, quantity: int}> $result */
        $result = [];

        foreach ($aggregated as $itemId => $quantity) {
            $result[] = [
                'item_id' => $itemId,
                'quantity' => $quantity,
            ];
        }

        return $result;
    }

    private function generateReferenceNumber(): string
    {
        return 'POS-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4));
    }

    /**
     * @param  array<int, array{item_id: int, sku: string|null, item_name: string, quantity: int, unit_price: float, line_total: float, remaining_stock: int}>  $lineItems
     */
    private function buildTransactionNotes(
        string $referenceNumber,
        string $paymentMode,
        ?string $notes,
        array $lineItems
    ): string {
        $itemSummaries = [];

        foreach ($lineItems as $lineItem) {
            $label = $lineItem['sku'] ?: 'ITEM-'.$lineItem['item_id'];
            $itemSummaries[] = $label.' x'.$lineItem['quantity'];
        }

        $segments = [
            'POS Sale '.$referenceNumber,
            'Payment: '.strtoupper($paymentMode),
        ];

        if (! empty($itemSummaries)) {
            $segments[] = 'Items: '.implode(', ', $itemSummaries);
        }

        $sanitizedNotes = trim((string) $notes);
        if ($sanitizedNotes !== '') {
            $segments[] = 'Notes: '.$sanitizedNotes;
        }

        return Str::limit(implode(' | ', $segments), 500, '');
    }
}
