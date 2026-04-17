<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\ServiceCatalog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    private User $customerUser;

    private Customer $customer;

    private Customer $otherCustomer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customerUser = User::factory()->create([
            'role' => 'customer',
        ]);

        $this->customer = Customer::factory()->create([
            'email' => $this->customerUser->email,
        ]);

        $this->otherCustomer = Customer::factory()->create();
    }

    public function test_my_transactions_returns_only_authenticated_customer_transactions(): void
    {
        $ownTransaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1500,
            'notes' => 'Oil change invoice',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->otherCustomer->id,
            'type' => 'invoice',
            'amount' => 2300,
            'notes' => 'Other customer invoice',
        ]);

        $response = $this->actingAs($this->customerUser)
            ->getJson('/api/v1/customer/transactions?per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $transactions = $response->json('data.data');

        $this->assertCount(1, $transactions);
        $this->assertSame($ownTransaction->id, $transactions[0]['id']);
        $this->assertSame($this->customer->id, $transactions[0]['customer_id']);
    }

    public function test_my_transactions_supports_search_date_and_payment_method_filters(): void
    {
        $matching = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 2100,
            'notes' => 'Engine tune up invoice',
            'payment_method' => 'gcash',
            'paid_at' => now()->subDay(),
        ]);

        $nonMatchingMethod = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1200,
            'notes' => 'Engine oil refill',
            'payment_method' => 'cash',
            'paid_at' => now()->subDay(),
        ]);

        $nonMatchingDate = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1800,
            'notes' => 'Engine timing check',
            'payment_method' => 'gcash',
            'paid_at' => now()->subDays(20),
        ]);

        CustomerTransaction::query()
            ->whereKey($nonMatchingDate->id)
            ->update(['created_at' => now()->subDays(20)]);

        CustomerTransaction::query()
            ->whereKey($nonMatchingMethod->id)
            ->update(['created_at' => now()->subDay()]);

        $response = $this->actingAs($this->customerUser)
            ->getJson('/api/v1/customer/transactions?search=engine&payment_method=gcash&from_date='.
                now()->subDays(2)->toDateString().'&to_date='.now()->toDateString().'&per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $transactions = $response->json('data.data');

        $this->assertCount(1, $transactions);
        $this->assertSame($matching->id, $transactions[0]['id']);
    }

    public function test_my_transactions_supports_paid_payment_state_filter(): void
    {
        $paidInvoice = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 2100,
            'xendit_status' => 'PAID',
            'paid_at' => now()->subHour(),
            'notes' => 'Paid invoice',
        ]);

        $paidReservationFee = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'reservation_fee',
            'amount' => 500,
            'xendit_status' => 'PAID',
            'paid_at' => now()->subHours(2),
            'notes' => 'Paid reservation fee',
        ]);

        $manualPayment = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'payment',
            'amount' => 800,
            'xendit_status' => null,
            'paid_at' => now()->subHours(3),
            'notes' => 'Manual cash payment',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'type' => 'invoice',
            'amount' => 1500,
            'xendit_status' => 'PENDING',
            'notes' => 'Pending invoice',
        ]);

        $response = $this->actingAs($this->customerUser)
            ->getJson('/api/v1/customer/transactions?payment_state=paid&per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $transactionIds = collect($response->json('data.data'))->pluck('id')->all();

        $this->assertContains($paidInvoice->id, $transactionIds);
        $this->assertContains($paidReservationFee->id, $transactionIds);
        $this->assertContains($manualPayment->id, $transactionIds);
        $this->assertCount(3, $transactionIds);
    }

    public function test_my_job_orders_returns_only_authenticated_customer_job_orders_with_status_fields(): void
    {
        $service = ServiceCatalog::create([
            'name' => 'Oil Change',
            'description' => 'Synthetic oil change service',
            'price_label' => 'P1200',
            'price_fixed' => 1200,
            'duration' => '30 mins',
            'estimated_duration' => '45-60 mins',
            'category' => 'maintenance',
            'features' => ['Oil refill'],
            'includes' => ['Oil filter replacement'],
            'rating' => 4.5,
            'rating_count' => 10,
            'recommended' => false,
            'is_active' => true,
        ]);

        $ownVehicle = Vehicle::factory()->create([
            'customer_id' => $this->customer->id,
        ]);

        $otherVehicle = Vehicle::factory()->create([
            'customer_id' => $this->otherCustomer->id,
        ]);

        $ownJobOrder = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $ownVehicle->id,
            'service_id' => $service->id,
            'status' => 'in_progress',
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '10:00',
            'reservation_expires_at' => now()->addMinutes(30),
        ]);

        JobOrder::factory()->create([
            'customer_id' => $this->otherCustomer->id,
            'vehicle_id' => $otherVehicle->id,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->customerUser)
            ->getJson('/api/v1/customer/job-orders');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $jobOrders = $response->json('data');

        $this->assertCount(1, $jobOrders);
        $this->assertSame($ownJobOrder->id, $jobOrders[0]['id']);
        $this->assertSame('in_progress', $jobOrders[0]['status']);
        $this->assertSame('In Progress', $jobOrders[0]['status_label']);
        $this->assertSame('orange', $jobOrders[0]['status_color']);
        $this->assertSame('maintenance', $jobOrders[0]['service']['category']);
        $this->assertSame('45-60 mins', $jobOrders[0]['service']['estimated_duration']);
        $this->assertSame(['Oil filter replacement'], $jobOrders[0]['service']['includes']);
        $this->assertNotNull($jobOrders[0]['reservation_expires_at']);
    }

    public function test_customer_cannot_access_other_customer_transactions_by_id_route(): void
    {
        CustomerTransaction::create([
            'customer_id' => $this->otherCustomer->id,
            'type' => 'invoice',
            'amount' => 1800,
            'notes' => 'Restricted invoice',
        ]);

        $this->actingAs($this->customerUser)
            ->getJson("/api/v1/customers/{$this->otherCustomer->id}/transactions")
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'You are not allowed to access this customer.');
    }

    public function test_customer_cannot_access_other_customer_job_orders_by_id_route(): void
    {
        $otherVehicle = Vehicle::factory()->create([
            'customer_id' => $this->otherCustomer->id,
        ]);

        JobOrder::factory()->create([
            'customer_id' => $this->otherCustomer->id,
            'vehicle_id' => $otherVehicle->id,
            'status' => 'approved',
        ]);

        $this->actingAs($this->customerUser)
            ->getJson("/api/v1/customers/{$this->otherCustomer->id}/job-orders")
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'You are not allowed to access this customer.');
    }

    public function test_frontdesk_can_still_access_customer_transactions_by_id_route(): void
    {
        $frontDesk = User::factory()->create([
            'role' => 'frontdesk',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->otherCustomer->id,
            'type' => 'invoice',
            'amount' => 900,
            'notes' => 'Frontdesk-accessible invoice',
        ]);

        $this->actingAs($frontDesk)
            ->getJson("/api/v1/customers/{$this->otherCustomer->id}/transactions")
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
