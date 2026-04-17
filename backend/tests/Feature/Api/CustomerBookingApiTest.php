<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Exceptions\PaymentGatewayException;
use App\Models\BookingSlot;
use App\Models\Customer;
use App\Models\CustomerTransaction;
use App\Models\JobOrder;
use App\Models\ServiceCatalog;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\XenditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerBookingApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Vehicle $vehicle;

    private ServiceCatalog $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
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
            ['capacity' => 3, 'is_active' => true, 'sort_order' => 1]
        );
        BookingSlot::query()->updateOrCreate(
            ['time' => '11:00'],
            ['capacity' => 3, 'is_active' => true, 'sort_order' => 2]
        );
    }

    public function test_availability_requires_authentication(): void
    {
        $date = now()->addDay()->toDateString();

        $this->getJson('/api/v1/customer/availability?arrival_date='.$date)
            ->assertStatus(401);
    }

    public function test_availability_returns_slots_with_database_counts(): void
    {
        $date = now()->addDay()->toDateString();

        $paidPendingJob = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'pending_approval',
            'arrival_date' => $date,
            'arrival_time' => '10:00',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $paidPendingJob->id,
            'type' => 'invoice',
            'amount' => 200,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
        ]);

        JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'approved',
            'arrival_date' => $date,
            'arrival_time' => '10:00',
        ]);
        JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'pending_approval',
            'arrival_date' => $date,
            'arrival_time' => '10:00',
            'reservation_expires_at' => now()->subMinute(),
        ]);
        JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'cancelled',
            'arrival_date' => $date,
            'arrival_time' => '11:00',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/customer/availability?arrival_date='.$date);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.arrival_date', $date);

        $slots = collect($response->json('data.slots'))->keyBy('time');

        $this->assertEquals('available', $slots->get('10:00')['status']);
        $this->assertEquals(1, $slots->get('10:00')['slots_left']);
        $this->assertEquals(3, $slots->get('10:00')['capacity']);
        $this->assertEquals(2, $slots->get('10:00')['booked']);

        $this->assertEquals('available', $slots->get('11:00')['status']);
        $this->assertEquals(3, $slots->get('11:00')['slots_left']);
        $this->assertEquals(0, $slots->get('11:00')['booked']);
    }

    public function test_store_rejects_vehicle_not_owned_by_customer(): void
    {
        $otherCustomerVehicle = Vehicle::factory()->create();

        $payload = [
            'vehicle_id' => $otherCustomerVehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '10:00',
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Selected vehicle does not belong to your account.');
    }

    public function test_store_rejects_full_slot(): void
    {
        BookingSlot::query()->where('time', '10:00')->update(['capacity' => 1]);
        $date = now()->addDay()->toDateString();

        $paidPendingJob = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'pending_approval',
            'arrival_date' => $date,
            'arrival_time' => '10:00',
        ]);

        CustomerTransaction::create([
            'customer_id' => $this->customer->id,
            'job_order_id' => $paidPendingJob->id,
            'type' => 'invoice',
            'amount' => 200,
            'xendit_status' => 'PAID',
            'paid_at' => now(),
        ]);

        $payload = [
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '10:00',
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Selected arrival slot is full. Please choose another time.');
    }

    public function test_store_rejects_booking_when_existing_pending_booking_hold_is_active(): void
    {
        BookingSlot::query()->where('time', '10:00')->update(['capacity' => 1]);
        $date = now()->addDay()->toDateString();

        JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'pending_approval',
            'arrival_date' => $date,
            'arrival_time' => '10:00',
            'reservation_expires_at' => now()->addMinutes(15),
        ]);

        $payload = [
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '10:00',
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Selected arrival slot is full. Please choose another time.');
    }

    public function test_store_allows_booking_when_existing_pending_booking_hold_has_expired(): void
    {
        BookingSlot::query()->where('time', '10:00')->update(['capacity' => 1]);
        $date = now()->addDay()->toDateString();

        JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'pending_approval',
            'arrival_date' => $date,
            'arrival_time' => '10:00',
            'reservation_expires_at' => now()->subMinute(),
        ]);

        $payload = [
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '10:00',
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book', $payload)
            ->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_store_creates_booking_when_slot_is_available(): void
    {
        BookingSlot::query()->where('time', '10:00')->update(['capacity' => 2]);
        $date = now()->addDay()->toDateString();

        $payload = [
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '10:00',
            'notes' => 'Please prioritize if possible.',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'pending_approval')
            ->assertJsonPath('data.arrival_date', $date)
            ->assertJsonPath('data.arrival_time', '10:00');

        $this->assertDatabaseHas('job_orders', [
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'status' => 'pending_approval',
            'arrival_date' => $date,
            'arrival_time' => '10:00',
        ]);

        $created = JobOrder::query()->latest('id')->first();

        $this->assertNotNull($created?->reservation_expires_at);
        $this->assertTrue($created?->reservation_expires_at?->isFuture() ?? false);
    }

    public function test_store_with_payment_creates_booking_transaction_and_payment_url(): void
    {
        BookingSlot::query()->where('time', '10:00')->update(['capacity' => 2]);
        $date = now()->addDay()->toDateString();

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')
                ->once()
                ->andReturnUsing(function (CustomerTransaction $transaction): string {
                    $url = 'https://checkout.xendit.co/inv-test-booking-fee';

                    $transaction->update([
                        'payment_url' => $url,
                        'xendit_status' => 'PENDING',
                    ]);

                    return $url;
                });
        });

        $payload = [
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => $date,
            'arrival_time' => '10:00',
            'payment_method' => 'gcash',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book-with-payment', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.job_order.status', 'pending_approval')
            ->assertJsonPath('data.payment_url', 'https://checkout.xendit.co/inv-test-booking-fee')
            ->assertJsonPath('data.payment_method', 'gcash');

        $jobOrder = JobOrder::query()->latest('id')->first();

        $this->assertNotNull($jobOrder);

        $this->assertDatabaseHas('customer_transactions', [
            'customer_id' => $this->customer->id,
            'job_order_id' => $jobOrder?->id,
            'type' => 'invoice',
            'payment_method' => 'gcash',
            'payment_url' => 'https://checkout.xendit.co/inv-test-booking-fee',
            'xendit_status' => 'PENDING',
        ]);

        $transactionId = $response->json('data.transaction_id');
        $this->assertIsInt($transactionId);
        $this->assertTrue(CustomerTransaction::query()->whereKey($transactionId)->exists());
    }

    public function test_store_with_payment_rejects_invalid_payment_method(): void
    {
        $payload = [
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '10:00',
            'payment_method' => 'cash',
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book-with-payment', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Selected payment method is invalid.');
    }

    public function test_store_with_payment_returns_sanitized_gateway_error_response(): void
    {
        BookingSlot::query()->where('time', '10:00')->update(['capacity' => 2]);

        $this->mock(XenditService::class, function ($mock): void {
            $mock->shouldReceive('createInvoice')
                ->once()
                ->andThrow(new PaymentGatewayException(
                    message: 'Unable to initialize online payment right now. Please try again later.',
                    errorCode: 'xendit_invoice_creation_failed',
                    statusCode: 503,
                ));
        });

        $payload = [
            'vehicle_id' => $this->vehicle->id,
            'service_id' => $this->service->id,
            'arrival_date' => now()->addDay()->toDateString(),
            'arrival_time' => '10:00',
            'payment_method' => 'gcash',
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/customer/book-with-payment', $payload)
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'xendit_invoice_creation_failed')
            ->assertJsonPath('message', 'Unable to initialize online payment right now. Please try again later.');

        $this->assertDatabaseCount('job_orders', 0);
        $this->assertDatabaseCount('customer_transactions', 0);
    }
}
