<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\BillingTransactionUpdated;
use App\Models\Archive;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LogBillingActivity
{

    public function handle(BillingTransactionUpdated $event): void
    {
        try {
            $t = $event->transaction;

            Archive::create([
                'entity_type' => 'billing',
                'entity_id' => $t->id,
                'action' => $event->action,
                'old_data' => $event->oldData,
                'new_data' => array_merge($event->newData, [
                    'transaction_type' => $t->type?->value ?? (string) $t->type,
                    'amount' => (float) $t->amount,
                    'payment_method' => $t->payment_method,
                    'xendit_status' => $t->xendit_status,
                    'customer_name' => $t->customer?->full_name,
                    'reference_number' => $t->reference_number,
                ]),
                'user_id' => Auth::id() ?? null,
                'reference_number' => $t->reference_number,
                'notes' => $this->buildNotes($event->action, $t),
                'archived_date' => $event->timestamp,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to log billing activity: '.$e->getMessage(), [
                'transaction_id' => $event->transaction->id ?? null,
                'action' => $event->action ?? null,
            ]);
        }
    }

    private function buildNotes(string $action, $t): string
    {
        $ref = $t->reference_number ?? '#'.$t->id;
        $amount = number_format((float) $t->amount, 2);

        return match ($action) {
            'invoice_created' => "Invoice {$ref} created for {$amount}",
            'invoice_issued' => "Invoice {$ref} issued",
            'invoice_voided' => "Invoice {$ref} voided",
            'invoice_updated' => "Invoice {$ref} updated",
            'payment_recorded' => "Payment of {$amount} recorded via {$t->payment_method}",
            'xendit_invoice_created' => "Xendit payment link generated for {$ref}",
            'xendit_status_changed' => "Xendit status for {$ref} changed to {$t->xendit_status}",
            'bulk_invoice_created' => "Bulk Xendit invoice created for multiple transactions",
            'remaining_balance_created' => "Remaining balance invoice created after reservation fee for {$ref}",
            'refund_processed' => "Refund of {$amount} processed",
            'pos_checkout' => "POS checkout {$ref} completed",
            default => "Billing action: {$action} on {$ref}",
        };
    }
}
