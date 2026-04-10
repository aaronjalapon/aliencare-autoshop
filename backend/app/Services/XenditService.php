<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CustomerTransactionType;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\Reservation;
use RuntimeException;
use Xendit\Configuration;
use Xendit\Invoice\CreateInvoiceRequest;
use Xendit\Invoice\InvoiceApi;

class XenditService
{
    private InvoiceApi $invoiceApi;

    public function __construct()
    {
        Configuration::setXenditKey((string) config('xendit.secret_key'));
        $this->invoiceApi = new InvoiceApi;
    }

    /**
     * Create a Xendit hosted invoice for the given transaction.
     * Persists xendit_invoice_id and payment_url onto the transaction record.
     *
     * @return string The Xendit hosted-payment URL
     *
     * @throws RuntimeException When the Xendit API call fails
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
            $createRequest = new CreateInvoiceRequest($requestData);
            $response = $this->invoiceApi->createInvoice($createRequest);
        } catch (\Throwable $e) {
            throw new RuntimeException('Xendit invoice creation failed: '.$e->getMessage(), 0, $e);
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
     * @throws RuntimeException When the Xendit API call fails
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
            $createRequest = new CreateInvoiceRequest($requestData);
            $response = $this->invoiceApi->createInvoice($createRequest);
        } catch (\Throwable $e) {
            $transaction->delete();
            throw new RuntimeException('Xendit invoice creation failed: '.$e->getMessage(), 0, $e);
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
}
