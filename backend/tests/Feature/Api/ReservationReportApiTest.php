<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Inventory;
use App\Models\Report;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationReportApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // RESERVATION INDEX TESTS

    public function test_reservation_index_returns_all_reservations(): void
    {
        Reservation::factory()->count(5)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reservations');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => ['id', 'item_id', 'job_order_number', 'quantity_reserved'],
                    ],
                ],
            ]);
    }

    public function test_reservation_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/reservations');

        $response->assertStatus(401);
    }

    public function test_reservation_index_filters_by_status(): void
    {
        Reservation::factory()->create(['status' => 'pending']);
        Reservation::factory()->create(['status' => 'approved']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reservations?status=pending');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_reservation_index_filters_by_job_order(): void
    {
        Reservation::factory()->create(['job_order_number' => 'JOB-001']);
        Reservation::factory()->create(['job_order_number' => 'JOB-002']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reservations?job_order=JOB-001');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_reservation_index_supports_pagination(): void
    {
        Reservation::factory()->count(20)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reservations?per_page=5');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(5, $data);
    }

    // RESERVATION SHOW TESTS

    public function test_reservation_show_returns_specific_reservation(): void
    {
        $reservation = Reservation::factory()->create();

        $response = $this->actingAs($this->user)
            ->getJson("/api/v1/reservations/{$reservation->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $reservation->id,
                ],
            ]);
    }

    public function test_reservation_show_requires_authentication(): void
    {
        $reservation = Reservation::factory()->create();

        $response = $this->getJson("/api/v1/reservations/{$reservation->id}");

        $response->assertStatus(401);
    }

    public function test_reservation_show_returns_404_for_nonexistent_reservation(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reservations/99999');

        $response->assertStatus(404);
    }

    // RESERVE PARTS TESTS

    public function test_reserve_parts_creates_reservation(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/reserve', [
                'item_id' => $inventory->item_id,
                'quantity' => 10,
                'job_order_number' => 'JOB-001',
                'notes' => 'For repair',
                'requested_by' => 'John Doe',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('reservations', [
            'item_id' => $inventory->item_id,
            'job_order_number' => 'JOB-001',
            'quantity_reserved' => 10,
        ]);
    }

    public function test_reserve_parts_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/reservations/reserve', [
            'item_id' => 'PART-001',
            'quantity' => 10,
            'job_order_number' => 'JOB-001',
        ]);

        $response->assertStatus(401);
    }

    public function test_reserve_parts_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/reserve', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item_id', 'quantity', 'job_order_number']);
    }

    public function test_reserve_parts_fails_with_insufficient_stock(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 5]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/reserve', [
                'item_id' => $inventory->item_id,
                'quantity' => 10,
                'job_order_number' => 'JOB-001',
            ]);

        $response->assertStatus(400);
    }

    public function test_reserve_parts_returns_404_for_nonexistent_item(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/reserve', [
                'item_id' => 'NONEXISTENT',
                'quantity' => 10,
                'job_order_number' => 'JOB-001',
            ]);

        $response->assertStatus(404);
    }

    // RESERVE MULTIPLE PARTS TESTS

    public function test_reserve_multiple_parts_creates_multiple_reservations(): void
    {
        $inventory1 = Inventory::factory()->create(['stock' => 100]);
        $inventory2 = Inventory::factory()->create(['stock' => 50]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/reserve-multiple', [
                'items' => [
                    ['item_id' => $inventory1->item_id, 'quantity' => 10],
                    ['item_id' => $inventory2->item_id, 'quantity' => 5],
                ],
                'job_order_number' => 'JOB-001',
                'notes' => 'Multiple parts reservation',
                'requested_by' => 'John Doe',
            ]);

        $response->assertStatus(201);
        $this->assertCount(2, Reservation::where('job_order_number', 'JOB-001')->get());
    }

    public function test_reserve_multiple_parts_handles_partial_failures(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reservations/reserve-multiple', [
                'items' => [
                    ['item_id' => $inventory->item_id, 'quantity' => 10],
                    ['item_id' => 'NONEXISTENT', 'quantity' => 5],
                ],
                'job_order_number' => 'JOB-001',
            ]);

        $response->assertStatus(207); // Multi-status
        $this->assertArrayHasKey('failed', $response->json());
    }

    // APPROVE RESERVATION TESTS

    public function test_approve_reservation_changes_status(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);
        $reservation = Reservation::factory()->create([
            'item_id' => $inventory->item_id,
            'status' => 'pending',
            'quantity_reserved' => 10,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/reservations/{$reservation->id}/approve", [
                'approved_by' => 'Admin',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Reservation approved successfully',
            ]);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'approved',
        ]);
    }

    public function test_approve_reservation_requires_authentication(): void
    {
        $reservation = Reservation::factory()->create();

        $response = $this->putJson("/api/v1/reservations/{$reservation->id}/approve");

        $response->assertStatus(401);
    }

    public function test_approve_reservation_returns_404_for_nonexistent_reservation(): void
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/v1/reservations/99999/approve');

        $response->assertStatus(404);
    }

    // REJECT RESERVATION TESTS

    public function test_reject_reservation_changes_status(): void
    {
        $reservation = Reservation::factory()->create(['status' => 'pending']);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/reservations/{$reservation->id}/reject", [
                'notes' => 'Insufficient stock',
                'approved_by' => 'Admin',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Reservation rejected successfully',
            ]);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'rejected',
        ]);
    }

    // COMPLETE RESERVATION TESTS

    public function test_complete_reservation_changes_status(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);
        $reservation = Reservation::factory()->create([
            'item_id' => $inventory->item_id,
            'status' => 'approved',
            'quantity_reserved' => 10,
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/reservations/{$reservation->id}/complete", [
                'completed_by' => 'Warehouse Staff',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Reservation completed successfully',
            ]);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'completed',
        ]);
    }

    // CANCEL RESERVATION TESTS

    public function test_cancel_reservation_changes_status(): void
    {
        $reservation = Reservation::factory()->create(['status' => 'pending']);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/reservations/{$reservation->id}/cancel", [
                'reason' => 'Job cancelled',
                'cancelled_by' => 'Manager',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Reservation cancelled successfully',
            ]);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'cancelled',
        ]);
    }

    // RESERVATION SUMMARY TESTS

    public function test_get_active_reservations_summary(): void
    {
        Reservation::factory()->count(3)->create(['status' => 'pending']);
        Reservation::factory()->count(2)->create(['status' => 'approved']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reservations/summary');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }

    // REPORT INDEX TESTS

    public function test_report_index_returns_all_reports(): void
    {
        Report::factory()->count(5)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => ['id', 'report_type', 'report_period'],
                    ],
                ],
            ]);
    }

    public function test_report_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/reports');

        $response->assertStatus(401);
    }

    public function test_report_index_filters_by_report_type(): void
    {
        Report::factory()->create(['report_type' => 'daily_usage']);
        Report::factory()->create(['report_type' => 'monthly_procurement']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports?report_type=daily_usage');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_report_index_filters_by_date_range(): void
    {
        Report::factory()->create(['report_period' => '2024-01-01']);
        Report::factory()->create(['report_period' => '2024-06-01']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports?start_date=2024-01-01&end_date=2024-03-01');

        $response->assertStatus(200);
    }

    // REPORT SHOW TESTS

    public function test_report_show_returns_specific_report(): void
    {
        $report = Report::factory()->create();

        $response = $this->actingAs($this->user)
            ->getJson("/api/v1/reports/{$report->id}");

        $response->assertStatus(200);
    }

    // GENERATE DAILY USAGE REPORT TESTS

    public function test_generate_daily_usage_report(): void
    {
        Inventory::factory()->count(3)->create();

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reports/daily-usage', [
                'date' => '2024-01-15',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Daily usage report generated successfully',
            ]);

        $this->assertDatabaseHas('reports', [
            'report_type' => 'daily_usage',
        ]);
    }

    public function test_generate_daily_usage_report_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/reports/daily-usage', [
            'date' => '2024-01-15',
        ]);

        $response->assertStatus(401);
    }

    public function test_generate_daily_usage_report_uses_current_date_by_default(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reports/daily-usage', []);

        $response->assertStatus(200);
    }

    public function test_generate_daily_usage_report_validates_date_format(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reports/daily-usage', [
                'date' => 'invalid-date',
            ]);

        $response->assertStatus(422);
    }

    // GENERATE MONTHLY PROCUREMENT REPORT TESTS

    public function test_generate_monthly_procurement_report(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reports/monthly-procurement', [
                'month' => '2024-01',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Monthly procurement report generated successfully',
            ]);

        $this->assertDatabaseHas('reports', [
            'report_type' => 'monthly_procurement',
        ]);
    }

    public function test_generate_monthly_procurement_report_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/reports/monthly-procurement', [
            'month' => '2024-01',
        ]);

        $response->assertStatus(401);
    }

    // GENERATE RECONCILIATION REPORT TESTS

    public function test_generate_reconciliation_report(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reports/reconciliation', [
                'start_date' => '2024-01-01',
                'end_date' => '2024-01-31',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Reconciliation report generated successfully',
            ]);

        $this->assertDatabaseHas('reports', [
            'report_type' => 'reconciliation',
        ]);
    }

    public function test_generate_reconciliation_report_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/reports/reconciliation', [
            'start_date' => '2024-01-01',
            'end_date' => '2024-01-31',
        ]);

        $response->assertStatus(401);
    }

    public function test_generate_reconciliation_report_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/reports/reconciliation', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_date', 'end_date']);
    }

    // ANALYTICS TESTS

    public function test_get_dashboard_analytics(): void
    {
        Inventory::factory()->count(5)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports/analytics/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }

    public function test_get_dashboard_analytics_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/reports/analytics/dashboard');

        $response->assertStatus(401);
    }

    public function test_get_usage_analytics(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports/analytics/usage?start_date=2024-01-01&end_date=2024-01-31');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }

    public function test_get_usage_analytics_uses_default_date_range(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports/analytics/usage');

        $response->assertStatus(200);
    }

    public function test_get_procurement_analytics(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports/analytics/procurement?start_date=2024-01-01&end_date=2024-06-30');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }

    public function test_get_procurement_analytics_uses_default_date_range(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/reports/analytics/procurement');

        $response->assertStatus(200);
    }
}
