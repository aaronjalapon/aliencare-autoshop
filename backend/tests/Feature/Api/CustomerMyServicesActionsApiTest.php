<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\BookingSlot;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\ServiceCatalog;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerMyServicesActionsApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Vehicle $vehicle;

    private ServiceCatalog $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'customer',
        ]);

        $this->customer = Customer::factory()->create([
            'email' => $this->user->email,
        ]);

        $this->vehicle = Vehicle::factory()->create([
            'customer_id' => $this->customer->id,
        ]);

        $this->service = ServiceCatalog::create([
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

        BookingSlot::query()->updateOrCreate(
            ['time' => '10:00'],
            ['capacity' => 2, 'is_active' => true, 'sort_order' => 1]
        );

        BookingSlot::query()->updateOrCreate(
            ['time' => '11:00'],
            ['capacity' => 2, 'is_active' => true, 'sort_order' => 2]
        );
    }

    public function test_customer_can_reschedule_own_upcoming_job_order(): void
    {
        $date = now()->addDays(2)->toDateString();

        $jobOrder = JobOrder::factory()->pendingApproval()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '10:00',
            'reservation_expires_at' => now()->addHour(),
        ]);

        $response = $this->actingAs($this->user)
            ->patchJson("/api/v1/customer/job-orders/{$jobOrder->id}/reschedule", [
                'arrival_date' => $date,
                'arrival_time' => '11:00',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $jobOrder->id)
            ->assertJsonPath('data.arrival_date', $date)
            ->assertJsonPath('data.arrival_time', '11:00');

        $this->assertDatabaseHas('job_orders', [
            'id' => $jobOrder->id,
            'arrival_date' => $date,
            'arrival_time' => '11:00',
        ]);
    }

    public function test_customer_cannot_reschedule_to_a_full_slot(): void
    {
        $date = now()->addDays(2)->toDateString();

        BookingSlot::query()->where('time', '11:00')->update(['capacity' => 1]);

        $otherCustomer = Customer::factory()->create();
        $otherVehicle = Vehicle::factory()->create([
            'customer_id' => $otherCustomer->id,
        ]);

        JobOrder::factory()->approved()->create([
            'customer_id' => $otherCustomer->id,
            'vehicle_id' => $otherVehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '11:00',
        ]);

        $ownJobOrder = JobOrder::factory()->pendingApproval()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '10:00',
            'reservation_expires_at' => now()->addHour(),
        ]);

        $this->actingAs($this->user)
            ->patchJson("/api/v1/customer/job-orders/{$ownJobOrder->id}/reschedule", [
                'arrival_date' => $date,
                'arrival_time' => '11:00',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Selected arrival slot is full. Please choose another time.');
    }

    public function test_customer_can_cancel_own_upcoming_job_order(): void
    {
        $jobOrder = JobOrder::factory()->approved()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '10:00',
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/customer/job-orders/{$jobOrder->id}/cancel");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('job_orders', [
            'id' => $jobOrder->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_customer_cannot_cancel_after_service_has_started(): void
    {
        $jobOrder = JobOrder::factory()->inProgress()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
        ]);

        $this->actingAs($this->user)
            ->deleteJson("/api/v1/customer/job-orders/{$jobOrder->id}/cancel")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only upcoming bookings can be canceled.');
    }

    public function test_customer_cannot_manage_another_customers_job_order(): void
    {
        $otherCustomer = Customer::factory()->create();
        $otherVehicle = Vehicle::factory()->create([
            'customer_id' => $otherCustomer->id,
        ]);

        $jobOrder = JobOrder::factory()->pendingApproval()->create([
            'customer_id' => $otherCustomer->id,
            'vehicle_id' => $otherVehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '10:00',
        ]);

        $this->actingAs($this->user)
            ->deleteJson("/api/v1/customer/job-orders/{$jobOrder->id}/cancel")
            ->assertStatus(403)
            ->assertJsonPath('message', 'You are not allowed to access this job order.');
    }

    public function test_customer_can_get_job_order_receipt_url(): void
    {
        $jobOrder = JobOrder::factory()->completed()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
        ]);

        $transaction = CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder->id,
            'type' => 'invoice',
            'amount' => 1200,
            'payment_url' => 'https://checkout.xendit.co/inv-test-receipt-url',
            'xendit_status' => 'PAID',
            'paid_at' => now(),
        ]);

        $this->actingAs($this->user)
            ->getJson("/api/v1/customer/job-orders/{$jobOrder->id}/receipt-url")
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.job_order_id', $jobOrder->id)
            ->assertJsonPath('data.transaction_id', $transaction->id)
            ->assertJsonPath('data.payment_url', 'https://checkout.xendit.co/inv-test-receipt-url');
    }

    public function test_customer_receipt_url_returns_not_found_when_missing(): void
    {
        $jobOrder = JobOrder::factory()->completed()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
        ]);

        $this->actingAs($this->user)
            ->getJson("/api/v1/customer/job-orders/{$jobOrder->id}/receipt-url")
            ->assertStatus(404)
            ->assertJsonPath('message', 'No receipt URL is available yet for this booking.');
    }
}
