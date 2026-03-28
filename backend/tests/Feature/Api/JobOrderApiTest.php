<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Bay;
use App\Models\Customer;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobOrderApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Customer $customer;

    private Vehicle $vehicle;

    private Mechanic $mechanic;

    private Bay $bay;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->customer = Customer::factory()->create();
        $this->vehicle = Vehicle::factory()->create(['customer_id' => $this->customer->id]);
        $this->mechanic = Mechanic::factory()->create(['user_id' => User::factory()->create()->id]);
        $this->bay = Bay::factory()->create();
    }

    // AUTH TESTS

    public function test_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/job-orders');
        $response->assertStatus(401);
    }

    // INDEX TESTS

    public function test_index_returns_paginated_job_orders(): void
    {
        JobOrder::factory(3)->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/job-orders');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => ['id', 'jo_number', 'status', 'status_label', 'status_color'],
                    ],
                ],
            ]);
    }

    public function test_index_filters_by_status(): void
    {
        JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'created',
        ]);
        JobOrder::factory()->approved()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'approved_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/job-orders?status=created');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
        $this->assertEquals('created', $data[0]['status']);
    }

    // STORE TESTS

    public function test_store_creates_job_order(): void
    {
        $payload = [
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_fee' => 1500.00,
            'notes' => 'Regular maintenance',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/job-orders', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'created');

        $this->assertDatabaseHas('job_orders', [
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'status' => 'created',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/job-orders', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['customer_id', 'vehicle_id']);
    }

    // SHOW TESTS

    public function test_show_returns_job_order(): void
    {
        $jobOrder = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/v1/job-orders/{$jobOrder->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $jobOrder->id);
    }

    public function test_show_returns_404_for_nonexistent_order(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/v1/job-orders/99999');

        $response->assertStatus(404);
    }

    // APPROVE TESTS

    public function test_approve_transitions_to_approved(): void
    {
        $jobOrder = JobOrder::factory()->pendingApproval()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrder->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('job_orders', [
            'id' => $jobOrder->id,
            'status' => 'approved',
            'approved_by' => $this->user->id,
        ]);
    }

    public function test_approve_fails_for_invalid_transition(): void
    {
        $jobOrder = JobOrder::factory()->inProgress()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'assigned_mechanic_id' => $this->mechanic->id,
            'bay_id' => $this->bay->id,
            'approved_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrder->id}/approve");

        $response->assertStatus(422);
    }

    // START TESTS

    public function test_start_transitions_to_in_progress(): void
    {
        $jobOrder = JobOrder::factory()->approved()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'approved_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrder->id}/start", [
                'mechanic_id' => $this->mechanic->id,
                'bay_id' => $this->bay->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('mechanics', [
            'id' => $this->mechanic->id,
            'availability_status' => 'busy',
        ]);

        $this->assertDatabaseHas('bays', [
            'id' => $this->bay->id,
            'status' => 'occupied',
        ]);
    }

    public function test_start_requires_mechanic_and_bay(): void
    {
        $jobOrder = JobOrder::factory()->approved()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'approved_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrder->id}/start", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mechanic_id', 'bay_id']);
    }

    // COMPLETE TESTS

    public function test_complete_transitions_to_completed(): void
    {
        $jobOrder = JobOrder::factory()->inProgress()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'assigned_mechanic_id' => $this->mechanic->id,
            'bay_id' => $this->bay->id,
            'approved_by' => $this->user->id,
        ]);
        $this->mechanic->update(['availability_status' => 'busy']);
        $this->bay->update(['status' => 'occupied']);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrder->id}/complete");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'completed');

        $this->assertDatabaseHas('mechanics', [
            'id' => $this->mechanic->id,
            'availability_status' => 'available',
        ]);

        $this->assertDatabaseHas('bays', [
            'id' => $this->bay->id,
            'status' => 'available',
        ]);
    }

    // SETTLE TESTS

    public function test_settle_transitions_to_settled(): void
    {
        $jobOrder = JobOrder::factory()->completed()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'assigned_mechanic_id' => $this->mechanic->id,
            'approved_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrder->id}/settle", [
                'invoice_id' => 'INV-2025-001',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'settled');

        $this->assertDatabaseHas('job_orders', [
            'id' => $jobOrder->id,
            'settled_flag' => true,
            'invoice_id' => 'INV-2025-001',
        ]);
    }

    // CANCEL TESTS

    public function test_cancel_transitions_to_cancelled(): void
    {
        $jobOrder = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/job-orders/{$jobOrder->id}/cancel");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_cancel_releases_assigned_resources(): void
    {
        $jobOrder = JobOrder::factory()->inProgress()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'assigned_mechanic_id' => $this->mechanic->id,
            'bay_id' => $this->bay->id,
            'approved_by' => $this->user->id,
        ]);
        $this->mechanic->update(['availability_status' => 'busy']);
        $this->bay->update(['status' => 'occupied']);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/job-orders/{$jobOrder->id}/cancel");

        $response->assertStatus(200);

        $this->assertDatabaseHas('mechanics', [
            'id' => $this->mechanic->id,
            'availability_status' => 'available',
        ]);
        $this->assertDatabaseHas('bays', [
            'id' => $this->bay->id,
            'status' => 'available',
        ]);
    }

    // FULL LIFECYCLE TEST

    public function test_full_lifecycle_create_to_settle(): void
    {
        // Step 1: Create
        $response = $this->actingAs($this->user)->postJson('/api/v1/job-orders', [
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'service_fee' => 2000.00,
            'notes' => 'Full lifecycle test',
        ]);
        $response->assertStatus(201);
        $jobOrderId = $response->json('data.id');

        // Step 2: Approve (from created → pending_approval needs manual status set for direct approve)
        // The spec says created → pending_approval → approved, so we test the two hops
        $jobOrder = JobOrder::find($jobOrderId);
        $jobOrder->update(['status' => 'pending_approval']);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrderId}/approve");
        $response->assertStatus(200)->assertJsonPath('data.status', 'approved');

        // Step 3: Start
        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrderId}/start", [
                'mechanic_id' => $this->mechanic->id,
                'bay_id' => $this->bay->id,
            ]);
        $response->assertStatus(200)->assertJsonPath('data.status', 'in_progress');

        // Step 4: Complete
        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrderId}/complete");
        $response->assertStatus(200)->assertJsonPath('data.status', 'completed');

        // Step 5: Settle
        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/job-orders/{$jobOrderId}/settle", [
                'invoice_id' => 'INV-LIFECYCLE-001',
            ]);
        $response->assertStatus(200)->assertJsonPath('data.status', 'settled');

        // Verify final state
        $this->assertDatabaseHas('job_orders', [
            'id' => $jobOrderId,
            'status' => 'settled',
            'settled_flag' => true,
            'invoice_id' => 'INV-LIFECYCLE-001',
        ]);
    }

    // ITEM MANAGEMENT TESTS

    public function test_add_item_to_job_order(): void
    {
        $jobOrder = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/job-orders/{$jobOrder->id}/items", [
                'item_type' => 'service',
                'description' => 'Oil Change',
                'quantity' => 1,
                'unit_price' => 800.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('job_order_items', [
            'job_order_id' => $jobOrder->id,
            'description' => 'Oil Change',
            'quantity' => 1,
        ]);
    }

    public function test_remove_item_from_job_order(): void
    {
        $jobOrder = JobOrder::factory()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
        ]);
        $item = JobOrderItem::factory()->service()->create(['job_order_id' => $jobOrder->id]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/job-orders/{$jobOrder->id}/items/{$item->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('job_order_items', ['id' => $item->id]);
    }

    public function test_cannot_add_items_to_settled_job_order(): void
    {
        $jobOrder = JobOrder::factory()->settled()->create([
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'approved_by' => $this->user->id,
            'assigned_mechanic_id' => $this->mechanic->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/job-orders/{$jobOrder->id}/items", [
                'item_type' => 'service',
                'description' => 'Should fail',
                'quantity' => 1,
                'unit_price' => 500.00,
            ]);

        $response->assertStatus(422);
    }

    // CUSTOMER ENDPOINT TESTS

    public function test_customer_index_returns_paginated_list(): void
    {
        Customer::factory(3)->create();

        $response = $this->actingAs($this->user)->getJson('/api/v1/customers');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_customer_store_creates_customer(): void
    {
        $payload = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'phone_number' => '09171234567',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/v1/customers', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.first_name', 'John');

        $this->assertDatabaseHas('customers', ['email' => 'john@example.com']);
    }

    // VEHICLE ENDPOINT TESTS

    public function test_vehicle_index_returns_list(): void
    {
        Vehicle::factory(2)->create(['customer_id' => $this->customer->id]);

        $response = $this->actingAs($this->user)->getJson('/api/v1/vehicles');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    // BAY ENDPOINT TESTS

    public function test_bay_index_returns_list(): void
    {
        Bay::factory(3)->create();

        $response = $this->actingAs($this->user)->getJson('/api/v1/bays');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    // MECHANIC ENDPOINT TESTS

    public function test_mechanic_index_returns_list(): void
    {
        Mechanic::factory(2)->create();

        $response = $this->actingAs($this->user)->getJson('/api/v1/mechanics');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
