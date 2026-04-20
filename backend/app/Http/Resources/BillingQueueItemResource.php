<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BillingQueueItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $firstName = trim((string) ($this->customer_first_name ?? ''));
        $lastName = trim((string) ($this->customer_last_name ?? ''));
        $customerName = trim($firstName.' '.$lastName);

        return [
            'entity_type' => (string) $this->entity_type,
            'entity_id' => (int) $this->entity_id,
            'customer_id' => (int) $this->customer_id,
            'customer_name' => $customerName !== '' ? $customerName : 'Unknown Customer',
            'customer_phone' => $this->customer_phone,
            'source' => (string) $this->source,
            'kind' => (string) $this->kind,
            'invoice_no' => (string) $this->invoice_no,
            'job_order_id' => $this->job_order_id !== null ? (int) $this->job_order_id : null,
            'job_order_no' => $this->job_order_no,
            'pos_reference' => $this->pos_reference,
            'vehicle_make' => $this->vehicle_make,
            'vehicle_model' => $this->vehicle_model,
            'vehicle_year' => $this->vehicle_year !== null ? (int) $this->vehicle_year : null,
            'plate_number' => $this->plate_number,
            'service_advisor' => $this->service_advisor,
            'payment_terms' => $this->payment_terms,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'due_at' => $this->due_at,
            'subtotal' => round((float) $this->subtotal, 2),
            'paid_total' => round((float) $this->paid_total, 2),
            'balance' => round((float) $this->balance, 2),
            'status' => (string) $this->status,
        ];
    }
}
