<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\ServiceCatalog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerBillingApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Customer $otherCustomer;

    private ServiceCatalog $service;

    private Vehicle $vehicle;

    private Vehicle $otherVehicle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'customer',
        ]);

        $this->customer = Customer::factory()->create([
            'email' => $this->user->email,
        ]);

        $this->otherCustomer = Customer::factory()->create();

        $this->vehicle = Vehicle::factory()->create([
            'customer_id' => $this->customer->id,
        ]);

        $this->otherVehicle = Vehicle::factory()->create([
            'customer_id' => $this->otherCustomer->id,
        ]);

        $this->service = ServiceCatalog::create([
            'name' => 'Full Detail Wash',
            'description' => 'Complete detailing package',
            'price_label' => 'P2000',
            'price_fixed' => 2000,
            'duration' => '60 mins',
            'estimated_duration' => '60-90 mins',
            'category' => 'cleaning',
            'features' => ['Exterior wash'],
            'includes' => ['Interior vacuum'],
            'rating' => 4.6,
            'rating_count' => 25,
            'recommended' => true,
            'is_active' => true,
        ]);
    }

    public function test_customer_billing_summary_returns_expected_aggregates(): void
    {
        $jobOrder = $this->createCompletedJobOrder($this->customer, $this->vehicle);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'invoice',
            'amount' => 1500,
            'xendit_status' => 'PENDING',
            'notes' => 'Pending invoice',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'reservation_fee',
            'amount' => 500,
            'xendit_status' => null,
            'notes' => 'Pending reservation fee',
        ]);

        $latestPaid = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'invoice',
            'amount' => 2000,
            'xendit_status' => 'PAID',
            'payment_method' => 'gcash',
            'paid_at' => now(),
            'notes' => 'Paid invoice',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'payment',
            'amount' => 300,
            'payment_method' => 'cash',
            'paid_at' => now()->subDay(),
            'notes' => 'Manual payment',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->otherCustomer->id,
            'type' => 'invoice',
            'amount' => 9999,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/customer/billing/summary');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.outstanding_balance', 2000)
            ->assertJsonPath('data.pending_count', 2)
            ->assertJsonPath('data.total_paid', 2300)
            ->assertJsonPath('data.paid_count', 2)
            ->assertJsonPath('data.total_transactions', 4)
            ->assertJsonPath('data.last_payment.id', $latestPaid->id);
    }

    public function test_customer_billing_receipts_returns_paid_receipts_only_with_line_items(): void
    {
        $jobOrder = $this->createCompletedJobOrder($this->customer, $this->vehicle);

        JobOrderItem::factory()->create([
            'job_order_id' => $jobOrder->id,
            'description' => 'Interior Vacuum',
            'quantity' => 1,
            'unit_price' => 300,
            'total_price' => 300,
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'invoice',
            'amount' => 2300,
            'xendit_status' => 'PAID',
            'payment_method' => 'maya',
            'paid_at' => now()->subHours(2),
            'notes' => 'Invoice paid online',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'invoice',
            'amount' => 900,
            'xendit_status' => 'PENDING',
            'notes' => 'Pending invoice should not appear in receipts',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'payment',
            'amount' => 450,
            'payment_method' => 'cash',
            'paid_at' => now(),
            'notes' => 'Counter payment',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/customer/billing/receipts?per_page=50');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $receipts = $response->json('data.data');

        $this->assertCount(2, $receipts);
        $this->assertSame('payment', $receipts[0]['transaction_type']);
        $this->assertSame('invoice', $receipts[1]['transaction_type']);
        $this->assertNotEmpty($receipts[1]['line_items']);
        $this->assertSame('JO-', substr((string) $receipts[1]['job_order_no'], 0, 3));
    }

    public function test_customer_billing_receipt_detail_enforces_ownership(): void
    {
        $ownJobOrder = $this->createCompletedJobOrder($this->customer, $this->vehicle);
        $otherJobOrder = $this->createCompletedJobOrder($this->otherCustomer, $this->otherVehicle);

        $ownReceipt = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $ownJobOrder->id,
            'type' => 'invoice',
            'amount' => 1800,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
            'notes' => 'Own receipt',
        ]);

        $otherReceipt = CustomerTransaction::create([
            'customer_id' => $this->otherCustomer->id,
            'job_order_id' => $otherJobOrder->id,
            'type' => 'invoice',
            'amount' => 2400,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
            'notes' => 'Other customer receipt',
        ]);

        $this->actingAs($this->user)
            ->getJson('/api/v1/customer/billing/receipts/'.$ownReceipt->id)
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.transaction_id', $ownReceipt->id);

        $this->actingAs($this->user)
            ->getJson('/api/v1/customer/billing/receipts/'.$otherReceipt->id)
            ->assertStatus(404)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Receipt not found.');
    }

    private function createCompletedJobOrder(Customer $customer, Vehicle $vehicle): JobOrder
    {
        return JobOrder::factory()->completed()->create([
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'service_id' => $this->service->id,
            'service_fee' => 2000,
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '10:00',
        ]);
    }
}