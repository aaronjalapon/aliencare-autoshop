<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Inventory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // HEALTH CHECK TESTS

    public function test_health_check_returns_healthy_status(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'status',
                'database',
                'timestamp',
                'version',
            ])
            ->assertJson([
                'success' => true,
                'status' => 'healthy',
                'database' => 'connected',
            ]);
    }

    public function test_health_check_does_not_require_authentication(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200);
    }

    // INDEX ENDPOINT TESTS

    public function test_index_returns_all_inventory_items(): void
    {
        Inventory::factory()->count(5)->create();

        $response = $this->actingAs($this->user)->getJson('/api/v1/inventory');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data' => [
                        '*' => ['id', 'item_id', 'item_name', 'stock'],
                    ],
                ],
            ]);
    }

    public function test_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/inventory');

        $response->assertStatus(401);
    }

    public function test_index_filters_by_category(): void
    {
        Inventory::factory()->create(['category' => 'Engine']);
        Inventory::factory()->create(['category' => 'Brake']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/inventory?category=Engine');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_index_filters_by_low_stock(): void
    {
        Inventory::factory()->create(['stock' => 5, 'reorder_level' => 10]);
        Inventory::factory()->create(['stock' => 20, 'reorder_level' => 10]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/inventory?low_stock=true');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_index_filters_by_search_term(): void
    {
        Inventory::factory()->create(['item_name' => 'Engine Oil Filter']);
        Inventory::factory()->create(['item_name' => 'Brake Pad']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/inventory?search=Engine');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
    }

    public function test_index_supports_pagination(): void
    {
        Inventory::factory()->count(20)->create();

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/inventory?per_page=5');

        $response->assertStatus(200);
        $data = $response->json('data.data');
        $this->assertCount(5, $data);
    }

    // STORE ENDPOINT TESTS

    public function test_store_creates_new_inventory_item(): void
    {
        $data = [
            'item_name' => 'Test Part',
            'category' => 'Engine',
            'unit_price' => 99.99,
            'reorder_level' => 10,
            'stock' => 100,
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory', $data);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Inventory item created successfully',
            ]);

        $this->assertDatabaseHas('inventories', [
            'item_name' => 'Test Part',
            'category' => 'Engine',
        ]);
    }

    public function test_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/inventory', [
            'item_name' => 'Test Part',
        ]);

        $response->assertStatus(401);
    }

    public function test_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item_name', 'category', 'stock', 'reorder_level', 'unit_price']);
    }

    public function test_store_validates_item_name_max_length(): void
    {
        $longName = str_repeat('A', 256);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory', [
                'item_name' => $longName,
                'category' => 'Engine',
                'stock' => 10,
                'reorder_level' => 5,
                'unit_price' => 99.99,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('item_name');
    }

    public function test_store_validates_numeric_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory', [
                'item_name' => 'Test Part',
                'category' => 'Engine',
                'unit_price' => 'not-a-number',
                'stock' => 'not-a-number',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['unit_price', 'stock']);
    }

    // SHOW ENDPOINT TESTS

    public function test_show_returns_specific_inventory_item(): void
    {
        $inventory = Inventory::factory()->create();

        $response = $this->actingAs($this->user)
            ->getJson("/api/v1/inventory/{$inventory->item_id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $inventory->item_id,
                    'item_id' => $inventory->item_id,
                ],
            ]);
    }

    public function test_show_requires_authentication(): void
    {
        $inventory = Inventory::factory()->create();

        $response = $this->getJson("/api/v1/inventory/{$inventory->item_id}");

        $response->assertStatus(401);
    }

    public function test_show_returns_404_for_nonexistent_item(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/inventory/99999');

        $response->assertStatus(404);
    }

    // UPDATE ENDPOINT TESTS

    public function test_update_modifies_inventory_item(): void
    {
        $inventory = Inventory::factory()->create(['item_name' => 'Old Name']);

        $response = $this->actingAs($this->user)
            ->putJson("/api/v1/inventory/{$inventory->item_id}", [
                'item_name' => 'New Name',
                'category' => $inventory->category,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Inventory item updated successfully',
            ]);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $inventory->item_id,
            'item_name' => 'New Name',
        ]);
    }

    public function test_update_requires_authentication(): void
    {
        $inventory = Inventory::factory()->create();

        $response = $this->putJson("/api/v1/inventory/{$inventory->item_id}", [
            'item_name' => 'New Name',
        ]);

        $response->assertStatus(401);
    }

    public function test_update_returns_404_for_nonexistent_item(): void
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/v1/inventory/99999', [
                'item_name' => 'New Name',
                'category' => 'Engine',
            ]);

        $response->assertStatus(500);
    }

    // DESTROY ENDPOINT TESTS

    public function test_destroy_discontinues_inventory_item(): void
    {
        $inventory = Inventory::factory()->create();

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/inventory/{$inventory->item_id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Inventory item discontinued successfully',
            ]);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $inventory->item_id,
            'status' => 'discontinued',
        ]);
    }

    public function test_destroy_requires_authentication(): void
    {
        $inventory = Inventory::factory()->create();

        $response = $this->deleteJson("/api/v1/inventory/{$inventory->item_id}");

        $response->assertStatus(401);
    }

    // CHECK STOCK LEVELS TESTS

    public function test_check_stock_levels_returns_availability_status(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 50]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/v1/inventory/{$inventory->item_id}/stock-status?requested_quantity=10");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }

    public function test_check_stock_levels_requires_authentication(): void
    {
        $inventory = Inventory::factory()->create();

        $response = $this->getJson("/api/v1/inventory/{$inventory->item_id}/stock-status");

        $response->assertStatus(401);
    }

    public function test_check_stock_levels_returns_404_for_nonexistent_item(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/inventory/99999/stock-status');

        $response->assertStatus(404);
    }

    // ADD STOCK TESTS

    public function test_add_stock_increases_inventory(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/add-stock', [
                'item_id' => $inventory->item_id,
                'quantity' => 50,
                'reference_number' => 'PO-001',
                'notes' => 'Purchase order',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Stock added successfully',
            ]);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $inventory->item_id,
            'stock' => 60,
        ]);
    }

    public function test_add_stock_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/inventory/add-stock', [
            'item_id' => 'PART-001',
            'quantity' => 50,
        ]);

        $response->assertStatus(401);
    }

    public function test_add_stock_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/add-stock', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item_id', 'quantity']);
    }

    public function test_add_stock_returns_404_for_nonexistent_item(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/add-stock', [
                'item_id' => 'NONEXISTENT',
                'quantity' => 50,
            ]);

        $response->assertStatus(404);
    }

    public function test_add_stock_creates_transaction_record(): void
    {
        $inventory = Inventory::factory()->create();

        $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/add-stock', [
                'item_id' => $inventory->item_id,
                'quantity' => 50,
                'reference_number' => 'PO-001',
            ]);

        $this->assertDatabaseHas('stock_transactions', [
            'item_id' => $inventory->item_id,
            'transaction_type' => 'procurement',
            'quantity' => 50,
        ]);
    }

    // DEDUCT STOCK TESTS

    public function test_deduct_stock_decreases_inventory(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/deduct-stock', [
                'item_id' => $inventory->item_id,
                'quantity' => 20,
                'reference_number' => 'SALE-001',
                'notes' => 'Customer sale',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Stock deducted successfully',
            ]);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $inventory->item_id,
            'stock' => 80,
        ]);
    }

    public function test_deduct_stock_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/inventory/deduct-stock', [
            'item_id' => 'PART-001',
            'quantity' => 20,
        ]);

        $response->assertStatus(401);
    }

    public function test_deduct_stock_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/deduct-stock', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item_id', 'quantity']);
    }

    public function test_deduct_stock_fails_with_insufficient_stock(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/deduct-stock', [
                'item_id' => $inventory->item_id,
                'quantity' => 20,
            ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_deduct_stock_creates_transaction_record(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);

        $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/deduct-stock', [
                'item_id' => $inventory->item_id,
                'quantity' => 20,
                'reference_number' => 'SALE-001',
            ]);

        $this->assertDatabaseHas('stock_transactions', [
            'item_id' => $inventory->item_id,
            'transaction_type' => 'sale',
            'quantity' => -20,
        ]);
    }

    // LOG RETURN/DAMAGE TESTS

    public function test_log_return_increases_stock(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/log-return-damage', [
                'item_id' => $inventory->item_id,
                'transaction_type' => 'return',
                'quantity' => 5,
                'reference_number' => 'RET-001',
                'notes' => 'Customer return',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $inventory->item_id,
            'stock' => 105,
        ]);
    }

    public function test_log_damage_decreases_stock(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 100]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/log-return-damage', [
                'item_id' => $inventory->item_id,
                'transaction_type' => 'damage',
                'quantity' => 5,
                'reference_number' => 'DMG-001',
                'notes' => 'Damaged in warehouse',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('inventories', [
            'item_id' => $inventory->item_id,
            'stock' => 95,
        ]);
    }

    public function test_log_return_damage_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/inventory/log-return-damage', [
            'item_id' => 'PART-001',
            'transaction_type' => 'return',
            'quantity' => 5,
        ]);

        $response->assertStatus(401);
    }

    public function test_log_return_damage_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/log-return-damage', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['item_id', 'transaction_type', 'quantity']);
    }

    public function test_log_damage_fails_with_insufficient_stock(): void
    {
        $inventory = Inventory::factory()->create(['stock' => 3]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/inventory/log-return-damage', [
                'item_id' => $inventory->item_id,
                'transaction_type' => 'damage',
                'quantity' => 5,
            ]);

        $response->assertStatus(400);
    }

    // GENERATE LOW STOCK ALERTS TESTS

    public function test_generate_low_stock_alerts_from_inventory_endpoint(): void
    {
        Inventory::factory()->create(['stock' => 5, 'reorder_level' => 10]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/inventory/alerts/low-stock');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
                'message',
            ]);
    }

    public function test_generate_low_stock_alerts_from_inventory_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/inventory/alerts/low-stock');

        $response->assertStatus(401);
    }
}
