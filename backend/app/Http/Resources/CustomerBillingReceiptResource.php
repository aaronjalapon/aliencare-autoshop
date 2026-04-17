<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\JobOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class CustomerBillingReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var JobOrder|null $jobOrder */
        $jobOrder = $this->relationLoaded('jobOrder') ? $this->jobOrder : null;
        $vehicle = $jobOrder?->vehicle;
        $customer = $jobOrder?->customer
            ?? ($this->relationLoaded('customer') ? $this->customer : null);

        return [
            'transaction_id' => $this->id,
            'transaction_type' => $this->type?->value ?? (string) $this->type,
            'job_order_id' => $this->job_order_id,
            'job_order_no' => $jobOrder?->jo_number,
            'paid_at' => $this->paid_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'payment_method' => $this->payment_method,
            'amount_paid' => abs((float) $this->amount),
            'notes' => $this->notes,
            'reference_number' => $this->reference_number,

            'booking_date' => $jobOrder?->created_at?->format('Y-m-d'),
            'booking_time' => $jobOrder?->created_at?->format('H:i'),
            'arrival_date' => $jobOrder?->arrival_date?->format('Y-m-d'),
            'arrival_time' => $jobOrder?->arrival_time,

            'customer_name' => $customer?->full_name ?? config('app.name'),
            'customer_phone' => $customer?->phone_number,

            'vehicle_make' => $vehicle?->make,
            'vehicle_model' => $vehicle?->model,
            'vehicle_plate' => $vehicle?->plate_number,

            'branch_name' => (string) config('billing.shop_name', config('app.name', 'Auto Shop')),
            'branch_address' => (string) config('billing.shop_address', ''),

            'line_items' => $this->buildLineItems($jobOrder)
                ->map(fn (array $item): array => [
                    'label' => $item['label'],
                    'amount' => (float) $item['amount'],
                ])
                ->values()
                ->all(),
        ];
    }

    private function buildLineItems(?JobOrder $jobOrder): Collection
    {
        $lineItems = collect();

        if ($jobOrder) {
            if ((float) $jobOrder->service_fee > 0) {
                $lineItems->push([
                    'label' => $jobOrder->service?->name ?? 'Service Fee',
                    'amount' => (float) $jobOrder->service_fee,
                ]);
            }

            if ($jobOrder->relationLoaded('items')) {
                foreach ($jobOrder->items as $item) {
                    $label = $item->description
                        ?: $item->inventoryItem?->item_name
                        ?: 'Job Order Item';

                    $lineItems->push([
                        'label' => $label,
                        'amount' => (float) $item->total_price,
                    ]);
                }
            }
        }

        if ($lineItems->isEmpty()) {
            $lineItems->push([
                'label' => $this->notes ?: 'Payment',
                'amount' => abs((float) $this->amount),
            ]);
        }

        return $lineItems;
    }
}