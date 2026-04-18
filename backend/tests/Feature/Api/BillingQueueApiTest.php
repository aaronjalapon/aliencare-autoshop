<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingQueueApiTest extends TestCase
{
    use RefreshDatabase;

    private User $frontDeskUser;

    private User $customerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->frontDeskUser = User::factory()->create([
            'role' => 'frontdesk',
        ]);

        $this->customerUser = User::factory()->create([
            'role' => 'customer',
        ]);
    }

    public function test_frontdesk_can_fetch_unified_billing_queue(): void
    {
        $customer = Customer::factory()->create();
        $jobOrder = $this->createServiceTicket($customer, [
            'service_fee' => 1200,
        ]);

        CustomerTransaction::create([
            'customer_id' => $customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'payment',
            'amount' => 300,
            'payment_method' => 'cash',
            'reference_number' => 'JO-PAY-1001',
            'notes' => 'Partial payment for service ticket',
        ]);

        CustomerTransaction::create([
            'customer_id' => $customer->id,
            'type' => 'invoice',
            'amount' => 750,
            'reference_number' => 'POS-20260418-1001',
            'payment_method' => 'cash',
            'notes' => 'POS invoice',
        ]);

        $response = $this->actingAs($this->frontDeskUser)
            ->getJson('/api/v1/billing/queue');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $rows = $response->json('data.data');
        $entityTypes = array_map(static fn (array $row): string => (string) $row['entity_type'], $rows);

        $this->assertContains('job_order', $entityTypes);
        $this->assertContains('pos_transaction', $entityTypes);
    }

    public function test_source_filter_online_returns_only_online_booking_rows(): void
    {
        $customer = Customer::factory()->create();

        $jobOrder = $this->createServiceTicket($customer);
        Reservation::factory()->pending()->create([
            'job_order_id' => $jobOrder->id,
            'job_order_number' => $jobOrder->jo_number,
        ]);

        $response = $this->actingAs($this->frontDeskUser)
            ->getJson('/api/v1/billing/queue?source=online');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $rows = $response->json('data.data');
        $this->assertNotEmpty($rows);

        foreach ($rows as $row) {
            $this->assertSame('online_booking', $row['source']);
        }
    }

    public function test_status_filter_paid_returns_only_paid_rows(): void
    {
        $customer = Customer::factory()->create();

        $paidJobOrder = $this->createServiceTicket($customer, [
            'service_fee' => 1000,
        ]);

        CustomerTransaction::create([
            'customer_id' => $customer->id,
            'job_order_id' => $paidJobOrder->id,
            'type' => 'invoice',
            'amount' => 1500,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
            'reference_number' => 'INV-PAID-1001',
        ]);

        $this->createServiceTicket($customer, [
            'service_fee' => 900,
        ]);

        $response = $this->actingAs($this->frontDeskUser)
            ->getJson('/api/v1/billing/queue?status=paid');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $rows = $response->json('data.data');
        $this->assertNotEmpty($rows);

        foreach ($rows as $row) {
            $this->assertSame('paid', $row['status']);
        }
    }

    public function test_customer_role_cannot_access_billing_queue(): void
    {
        $this->actingAs($this->customerUser)
            ->getJson('/api/v1/billing/queue')
            ->assertStatus(403);
    }

    private function createServiceTicket(Customer $customer, array $overrides = []): JobOrder
    {
        $vehicle = Vehicle::factory()->create([
            'customer_id' => $customer->id,
        ]);

        $jobOrder = JobOrder::factory()->create(array_merge([
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'status' => 'completed',
            'service_fee' => 1000,
        ], $overrides));

        JobOrderItem::factory()->create([
            'job_order_id' => $jobOrder->id,
            'quantity' => 1,
            'unit_price' => 500,
            'total_price' => 500,
            'description' => 'Service labor',
        ]);

        return $jobOrder;
    }
}
