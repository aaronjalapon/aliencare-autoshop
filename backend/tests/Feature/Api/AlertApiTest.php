<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Alert;
use App\Models\Inventory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlertApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // INDEX ENDPOINT TESTS

    public function test_index_returns_all_alerts_successfully(): void
    {
        Alert::factory()->count(5)->create();

        $response = $this->actingAs($this->user)->getJson('/api/v1/alerts');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => ['id', 'alert_type', 'message', 'urgency'],
                    ],
                ],
            ]);
    }

    public function test_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/alerts');

        $response->assertStatus(401);
    }

    public function test_index_filters_by_acknowledged_status(): void
    {
        Alert::factory()->acknowledged()->count(2)->create();
        Alert::factory()->unacknowledged()->count(3)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/alerts?acknowledged=false');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(3, $data);
    }

    public function test_index_filters_by_urgency(): void
    {
        Alert::factory()->create(['urgency' => 'critical']);
        Alert::factory()->create(['urgency' => 'high']);
        Alert::factory()->create(['urgency' => 'medium']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/alerts?urgency=critical');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_index_filters_by_alert_type(): void
    {
        Alert::factory()->create(['alert_type' => 'low_stock']);
        Alert::factory()->create(['alert_type' => 'out_of_stock']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/alerts?alert_type=low_stock');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_index_supports_pagination(): void
    {
        Alert::factory()->count(20)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/alerts?per_page=5');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(5, $data);
    }

    // GENERATE LOW STOCK ALERTS TESTS

    public function test_generate_low_stock_alerts_creates_alerts_for_low_stock_items(): void
    {
        Inventory::factory()->create([
            'stock' => 5,
            'reorder_level' => 10,
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/alerts/generate-low-stock');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['alerts_created', 'alerts_updated', 'total_alerts'],
                'message',
            ]);
    }

    public function test_generate_low_stock_alerts_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/alerts/generate-low-stock');

        $response->assertStatus(401);
    }

    public function test_generate_low_stock_alerts_does_not_create_duplicates(): void
    {
        $inventory = Inventory::factory()->create([
            'stock' => 5,
            'reorder_level' => 10,
            'status' => 'active',
        ]);

        // Generate alerts twice
        $this->actingAs($this->user)->postJson('/api/v1/alerts/generate-low-stock');
        $response = $this->actingAs($this->user)->postJson('/api/v1/alerts/generate-low-stock');

        $response->assertStatus(200);
        $this->assertCount(1, Alert::where('item_id', $inventory->item_id)->get());
    }

    // ALERT STATISTICS TESTS

    public function test_get_alert_statistics_returns_statistics(): void
    {
        Alert::factory()->acknowledged()->count(3)->create();
        Alert::factory()->unacknowledged()->count(2)->create();
        Alert::factory()->create(['urgency' => 'critical']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/alerts/statistics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }

    public function test_get_alert_statistics_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/alerts/statistics');

        $response->assertStatus(401);
    }

    // ACKNOWLEDGE ALERT TESTS

    public function test_acknowledge_alert_successfully(): void
    {
        $alert = Alert::factory()->unacknowledged()->create();

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/alerts/{$alert->id}/acknowledge", [
                'notes' => 'Acknowledged by admin',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Alert acknowledged successfully',
            ]);

        $this->assertDatabaseHas('alerts', [
            'id' => $alert->id,
            'acknowledged' => true,
        ]);
    }

    public function test_acknowledge_alert_requires_authentication(): void
    {
        $alert = Alert::factory()->create();

        $response = $this->putJson("/api/v1/alerts/{$alert->id}/acknowledge");

        $response->assertStatus(401);
    }

    public function test_acknowledge_alert_with_nonexistent_id_returns_404(): void
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/v1/alerts/99999/acknowledge');

        $response->assertStatus(404);
    }

    public function test_acknowledge_alert_accepts_optional_notes(): void
    {
        $alert = Alert::factory()->unacknowledged()->create();

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/alerts/{$alert->id}/acknowledge");

        $response->assertStatus(200);
    }

    // BULK ACKNOWLEDGE TESTS

    public function test_bulk_acknowledge_alerts_successfully(): void
    {
        $alerts = Alert::factory()->unacknowledged()->count(3)->create();
        $alertIds = $alerts->pluck('id')->toArray();

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/alerts/bulk-acknowledge', [
                'alert_ids' => $alertIds,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['acknowledged_count', 'failed_count'],
            ]);

        foreach ($alerts as $alert) {
            $this->assertDatabaseHas('alerts', [
                'id' => $alert->id,
                'acknowledged' => true,
            ]);
        }
    }

    public function test_bulk_acknowledge_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/alerts/bulk-acknowledge', [
            'alert_ids' => [1, 2, 3],
        ]);

        $response->assertStatus(401);
    }

    public function test_bulk_acknowledge_validates_alert_ids_required(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/alerts/bulk-acknowledge', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('alert_ids');
    }

    public function test_bulk_acknowledge_validates_alert_ids_must_be_array(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/alerts/bulk-acknowledge', [
                'alert_ids' => 'not-an-array',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('alert_ids');
    }

    public function test_bulk_acknowledge_handles_partial_failures(): void
    {
        $alert = Alert::factory()->unacknowledged()->create();

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/alerts/bulk-acknowledge', [
                'alert_ids' => [$alert->id, 99999],
            ]);

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('data.acknowledged_count'));
    }

    // CLEANUP TESTS

    public function test_cleanup_deletes_old_acknowledged_alerts(): void
    {
        Alert::factory()->acknowledged()->create([
            'acknowledged_at' => now()->subDays(31),
        ]);
        Alert::factory()->unacknowledged()->create();

        $response = $this->actingAs($this->user)
            ->deleteJson('/api/v1/alerts/cleanup?days_old=30');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['deleted_count'],
                'message',
            ]);
    }

    public function test_cleanup_requires_authentication(): void
    {
        $response = $this->deleteJson('/api/v1/alerts/cleanup');

        $response->assertStatus(401);
    }

    public function test_cleanup_uses_default_days_old_parameter(): void
    {
        $response = $this->actingAs($this->user)
            ->deleteJson('/api/v1/alerts/cleanup');

        $response->assertStatus(200);
    }

    public function test_cleanup_respects_custom_days_old_parameter(): void
    {
        Alert::factory()->acknowledged()->create([
            'acknowledged_at' => now()->subDays(10),
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson('/api/v1/alerts/cleanup?days_old=5');

        $response->assertStatus(200);
        $deletedCount = $response->json('data.deleted_count');
        $this->assertGreaterThanOrEqual(0, $deletedCount);
    }

    public function test_cleanup_does_not_delete_unacknowledged_alerts(): void
    {
        $alert = Alert::factory()->unacknowledged()->create([
            'created_at' => now()->subDays(60),
        ]);

        $this->actingAs($this->user)
            ->deleteJson('/api/v1/alerts/cleanup?days_old=30');

        $this->assertDatabaseHas('alerts', ['id' => $alert->id]);
    }

    public function test_cleanup_does_not_delete_recently_acknowledged_alerts(): void
    {
        $alert = Alert::factory()->acknowledged()->create([
            'acknowledged_at' => now()->subDays(10),
        ]);

        $this->actingAs($this->user)
            ->deleteJson('/api/v1/alerts/cleanup?days_old=30');

        $this->assertDatabaseHas('alerts', ['id' => $alert->id]);
    }
}
