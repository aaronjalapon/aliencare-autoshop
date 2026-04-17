<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\PaymentGatewayException;
use App\Enums\CustomerTransactionType;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\Reservation;
use Illuminate\Support\Facades\Log;
use Xendit\Configuration;
use Xendit\Invoice\CreateInvoiceRequest;
use Xendit\Invoice\InvoiceApi;

class XenditService
{
    private InvoiceApi $invoiceApi;

    public function __construct()
    {
        $secretKey = $this->resolveSecretKey();

        try {
            $this->withoutDeprecationWarnings(function () use ($secretKey): void {
                Configuration::setXenditKey($secretKey);
                $this->invoiceApi = new InvoiceApi();
            });
        } catch (\Throwable $e) {
            Log::error('Xendit client initialization failed.', [
                'exception' => $e::class,
                'provider_message' => $e->getMessage(),
            ]);

            throw new PaymentGatewayException(
                message: 'Online payment is temporarily unavailable. Please try again later.',
                errorCode: 'xendit_client_initialization_failed',
                statusCode: 503,
                previous: $e,
            );
        }
    }

    /**
     * Create a Xendit hosted invoice for the given transaction.
     * Persists xendit_invoice_id and payment_url onto the transaction record.
     *
     * @return string The Xendit hosted-payment URL
     *
    * @throws PaymentGatewayException When the Xendit API call fails
     */
    public function createInvoice(CustomerTransaction $transaction, Customer $customer): string
    {
        $externalId = 'TXN-'.$transaction->id.'-'.time();

        $requestData = [
            'external_id' => $externalId,
            'amount' => (float) $transaction->amount,
            'payer_email' => $customer->email,
            'description' => $this->buildDescription($transaction),
            'invoice_duration' => 86400, // 24 hours
            'success_redirect_url' => (string) config('xendit.success_redirect_url'),
            'failure_redirect_url' => (string) config('xendit.failure_redirect_url'),
            'currency' => 'PHP',
        ];

        try {
            $response = $this->withoutDeprecationWarnings(function () use ($requestData) {
                $createRequest = new CreateInvoiceRequest($requestData);

                return $this->invoiceApi->createInvoice($createRequest);
            });
        } catch (\Throwable $e) {
            Log::error('Xendit invoice creation failed for booking payment.', [
                'transaction_id' => $transaction->id,
                'customer_id' => $customer->id,
                'exception' => $e::class,
                'provider_message' => $e->getMessage(),
            ]);

            throw new PaymentGatewayException(
                message: 'Unable to initialize online payment right now. Please try again later.',
                errorCode: 'xendit_invoice_creation_failed',
                statusCode: 503,
                previous: $e,
            );
        }

        $paymentUrl = $response->getInvoiceUrl();

        $transaction->update([
            'external_id' => $externalId,
            'xendit_invoice_id' => $response->getId(),
            'payment_url' => $paymentUrl,
            'xendit_status' => 'PENDING',
        ]);

        return $paymentUrl;
    }

    private function buildDescription(CustomerTransaction $transaction): string
    {
        if ($transaction->notes) {
            return $transaction->notes;
        }

        if ($transaction->reservation_id) {
            return 'Reservation Fee — Reservation #'.$transaction->reservation_id;
        }

        if ($transaction->job_order_id) {
            return 'Payment for Job Order #'.$transaction->job_order_id;
        }

        return 'Payment — Transaction #'.$transaction->id;
    }

    /**
     * Create a Xendit hosted invoice for a reservation fee.
     * Creates the CustomerTransaction, generates the Xendit invoice, and links everything.
     *
     * @return string The Xendit hosted-payment URL
     *
    * @throws PaymentGatewayException When the Xendit API call fails
     */
    public function createReservationFeeInvoice(Reservation $reservation, Customer $customer): string
    {
        $externalId = 'RES-'.$reservation->id.'-'.time();

        $transaction = CustomerTransaction::create([
            'customer_id' => $customer->id,
            'reservation_id' => $reservation->id,
            'type' => CustomerTransactionType::ReservationFee,
            'amount' => $reservation->reservation_fee,
            'notes' => "Reservation fee for Reservation #{$reservation->id} (Job: {$reservation->job_order_number})",
        ]);

        $requestData = [
            'external_id' => $externalId,
            'amount' => (float) $reservation->reservation_fee,
            'payer_email' => $customer->email,
            'description' => "Reservation Fee — #{$reservation->id} ({$reservation->job_order_number})",
            'invoice_duration' => 86400, // 24 hours
            'success_redirect_url' => (string) config('xendit.reservation_success_redirect_url'),
            'failure_redirect_url' => (string) config('xendit.reservation_failure_redirect_url'),
            'currency' => 'PHP',
        ];

        try {
            $response = $this->withoutDeprecationWarnings(function () use ($requestData) {
                $createRequest = new CreateInvoiceRequest($requestData);

                return $this->invoiceApi->createInvoice($createRequest);
            });
        } catch (\Throwable $e) {
            $transaction->delete();

            Log::error('Xendit invoice creation failed for reservation fee.', [
                'reservation_id' => $reservation->id,
                'customer_id' => $customer->id,
                'transaction_id' => $transaction->id,
                'exception' => $e::class,
                'provider_message' => $e->getMessage(),
            ]);

            throw new PaymentGatewayException(
                message: 'Unable to initialize online payment right now. Please try again later.',
                errorCode: 'xendit_invoice_creation_failed',
                statusCode: 503,
                previous: $e,
            );
        }

        $paymentUrl = $response->getInvoiceUrl();

        $transaction->update([
            'external_id' => $externalId,
            'xendit_invoice_id' => $response->getId(),
            'payment_url' => $paymentUrl,
            'xendit_status' => 'PENDING',
        ]);

        // Link the fee transaction back to the reservation
        $reservation->update(['fee_transaction_id' => $transaction->id]);

        return $paymentUrl;
    }

    /**
     * Create a single Xendit invoice covering multiple pending transactions.
     * Tags every included transaction with a shared batch_external_id so the
     * webhook can settle them all at once.
     *
     * @param  \Illuminate\Support\Collection<int, CustomerTransaction>  $transactions
     * @return string The Xendit hosted-payment URL
     *
    * @throws PaymentGatewayException When the Xendit API call fails
     */
    public function createBulkInvoice(\Illuminate\Support\Collection $transactions, Customer $customer): string
    {
        $totalAmount = $transactions->sum(fn (CustomerTransaction $t) => (float) $t->amount);
        $batchExternalId = 'BATCH-'.$customer->id.'-'.time();

        $count = $transactions->count();
        $description = "Bulk payment for {$count} pending transaction".($count > 1 ? 's' : '');

        $requestData = [
            'external_id' => $batchExternalId,
            'amount' => $totalAmount,
            'payer_email' => $customer->email,
            'description' => $description,
            'invoice_duration' => 86400, // 24 hours
            'success_redirect_url' => (string) config('xendit.success_redirect_url'),
            'failure_redirect_url' => (string) config('xendit.failure_redirect_url'),
            'currency' => 'PHP',
        ];

        try {
            $response = $this->withoutDeprecationWarnings(function () use ($requestData) {
                $createRequest = new CreateInvoiceRequest($requestData);

                return $this->invoiceApi->createInvoice($createRequest);
            });
        } catch (\Throwable $e) {
            Log::error('Xendit bulk invoice creation failed.', [
                'customer_id' => $customer->id,
                'transaction_count' => $transactions->count(),
                'exception' => $e::class,
                'provider_message' => $e->getMessage(),
            ]);

            throw new PaymentGatewayException(
                message: 'Unable to initialize online payment right now. Please try again later.',
                errorCode: 'xendit_bulk_invoice_creation_failed',
                statusCode: 503,
                previous: $e,
            );
        }

        $paymentUrl = $response->getInvoiceUrl();
        $xenditInvoiceId = $response->getId();

        // Tag every transaction with the batch identifier
        foreach ($transactions as $transaction) {
            $transaction->update([
                'batch_external_id' => $batchExternalId,
                'xendit_invoice_id' => $xenditInvoiceId,
                'payment_url' => $paymentUrl,
                'xendit_status' => 'PENDING',
            ]);
        }

        return $paymentUrl;
    }

    /**
     * Query the Xendit API for invoice details needed by sync flows.
     *
     * @return array{status: string, payment_method: string|null}|null
     */
    public function getInvoiceSnapshot(string $xenditInvoiceId): ?array
    {
        try {
            $invoice = $this->withoutDeprecationWarnings(function () use ($xenditInvoiceId) {
                return $this->invoiceApi->getInvoiceById($xenditInvoiceId);
            });

            $status = $this->normalizeInvoiceEnumValue($invoice->getStatus());

            if (! $status) {
                return null;
            }

            return [
                'status' => $status,
                'payment_method' => $this->normalizeInvoiceEnumValue($invoice->getPaymentMethod()),
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Query the Xendit API for the current status of an invoice.
     *
     * @return string|null The invoice status (e.g. PENDING, PAID, EXPIRED) or null on failure
     */
    public function getInvoiceStatus(string $xenditInvoiceId): ?string
    {
        return $this->getInvoiceSnapshot($xenditInvoiceId)['status'] ?? null;
    }

    private function normalizeInvoiceEnumValue(mixed $value): ?string
    {
        if (is_string($value)) {
            $trimmed = trim($value);

            return $trimmed !== '' ? $trimmed : null;
        }

        if (is_object($value)) {
            if (method_exists($value, 'getValue')) {
                $enumValue = $value->getValue();

                if (is_string($enumValue)) {
                    $trimmed = trim($enumValue);

                    return $trimmed !== '' ? $trimmed : null;
                }
            }

            if (method_exists($value, '__toString')) {
                $trimmed = trim((string) $value);

                return $trimmed !== '' ? $trimmed : null;
            }
        }

        return null;
    }

    /**
     * Validate Xendit key configuration before initializing the SDK client.
     */
    private function resolveSecretKey(): string
    {
        $secretKey = trim((string) config('xendit.secret_key'));

        if ($secretKey === '' || $this->looksLikePlaceholder($secretKey)) {
            Log::warning('Xendit secret key is missing or left as a placeholder.');

            throw new PaymentGatewayException(
                message: 'Online payment is temporarily unavailable. Please contact support.',
                errorCode: 'xendit_configuration_invalid',
                statusCode: 503,
            );
        }

        if ($this->looksLikePublicKey($secretKey)) {
            Log::warning('Xendit secret key appears to be a public key; refusing to initialize payment client.');

            throw new PaymentGatewayException(
                message: 'Online payment is temporarily unavailable. Please contact support.',
                errorCode: 'xendit_configuration_invalid',
                statusCode: 503,
            );
        }

        return $secretKey;
    }

    private function looksLikePlaceholder(string $key): bool
    {
        $normalized = strtolower(trim($key));

        return str_contains($normalized, 'rotate_in_xendit')
            || str_contains($normalized, 'set_here')
            || str_contains($normalized, 'your_xendit_secret_key');
    }

    private function looksLikePublicKey(string $key): bool
    {
        $normalized = strtolower(trim($key));

        return str_starts_with($normalized, 'xnd_public_');
    }

    /**
     * Wrap vendor calls so PHP 8.4 deprecation notices in third-party SDKs
     * do not pollute API responses while preserving normal warnings elsewhere.
     *
     * @template T
     *
     * @param  callable():T  $callback
     * @return T
     */
    private function withoutDeprecationWarnings(callable $callback): mixed
    {
        $previous = error_reporting();
        error_reporting($previous & ~E_DEPRECATED & ~E_USER_DEPRECATED);

        try {
            return $callback();
        } finally {
            error_reporting($previous);
        }
    }
}
