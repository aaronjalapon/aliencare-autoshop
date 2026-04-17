<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\ServiceCatalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceCatalogManagementApiTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    private User $frontDeskUser;

    private User $customerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create(['role' => 'admin']);
        $this->frontDeskUser = User::factory()->create(['role' => 'frontdesk']);
        $this->customerUser = User::factory()->create(['role' => 'customer']);
    }

    public function test_public_index_returns_only_active_services(): void
    {
        $activeService = $this->createService(['name' => 'Active Service', 'is_active' => true]);
        $this->createService(['name' => 'Inactive Service', 'is_active' => false]);

        $response = $this->getJson('/api/v1/services');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $items = $response->json('data.data');

        $this->assertCount(1, $items);
        $this->assertSame($activeService->id, $items[0]['id']);
    }

    public function test_management_endpoints_require_authentication(): void
    {
        $response = $this->getJson('/api/v1/services/manage');
        $response->assertStatus(401);

        $response = $this->postJson('/api/v1/services', $this->servicePayload());
        $response->assertStatus(401);

        $service = $this->createService();

        $response = $this->putJson('/api/v1/services/'.$service->id, ['name' => 'Updated']);
        $response->assertStatus(401);

        $response = $this->deleteJson('/api/v1/services/'.$service->id);
        $response->assertStatus(401);
    }

    public function test_frontdesk_can_create_update_and_deactivate_services(): void
    {
        $createResponse = $this->actingAs($this->frontDeskUser)
            ->postJson('/api/v1/services', $this->servicePayload());

        $createResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Service created successfully.')
            ->assertJsonPath('data.name', 'Frontdesk Created Service');

        $serviceId = (int) $createResponse->json('data.id');

        $this->assertDatabaseHas('service_catalogs', [
            'id' => $serviceId,
            'name' => 'Frontdesk Created Service',
            'is_active' => 1,
        ]);

        $updateResponse = $this->actingAs($this->frontDeskUser)
            ->putJson('/api/v1/services/'.$serviceId, [
                'name' => 'Frontdesk Updated Service',
                'recommended' => false,
                'recommended_note' => 'This note should be cleared',
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Service updated successfully.')
            ->assertJsonPath('data.name', 'Frontdesk Updated Service')
            ->assertJsonPath('data.recommended', false)
            ->assertJsonPath('data.recommended_note', null);

        $deactivateResponse = $this->actingAs($this->frontDeskUser)
            ->deleteJson('/api/v1/services/'.$serviceId);

        $deactivateResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Service deactivated successfully.')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('service_catalogs', [
            'id' => $serviceId,
            'is_active' => 0,
        ]);
    }

    public function test_admin_can_view_management_list_including_inactive_services(): void
    {
        $activeService = $this->createService(['name' => 'Admin Visible Active', 'is_active' => true]);
        $inactiveService = $this->createService(['name' => 'Admin Visible Inactive', 'is_active' => false]);

        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/services/manage?per_page=100');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $ids = collect($response->json('data.data'))->pluck('id');

        $this->assertTrue($ids->contains($activeService->id));
        $this->assertTrue($ids->contains($inactiveService->id));
    }

    public function test_customer_role_cannot_manage_services(): void
    {
        $this->actingAs($this->customerUser)
            ->getJson('/api/v1/services/manage')
            ->assertStatus(403);

        $this->actingAs($this->customerUser)
            ->postJson('/api/v1/services', $this->servicePayload())
            ->assertStatus(403);
    }

    public function test_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->frontDeskUser)
            ->postJson('/api/v1/services', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'name',
                'price_label',
                'price_fixed',
                'duration',
                'estimated_duration',
                'category',
            ]);
    }

    public function test_deactivated_service_is_hidden_from_public_and_visible_in_management(): void
    {
        $service = $this->createService(['name' => 'Deactivate Me', 'is_active' => true]);

        $this->actingAs($this->frontDeskUser)
            ->deleteJson('/api/v1/services/'.$service->id)
            ->assertStatus(200);

        $publicResponse = $this->getJson('/api/v1/services?per_page=100');
        $publicIds = collect($publicResponse->json('data.data'))->pluck('id');

        $this->assertFalse($publicIds->contains($service->id));

        $managementResponse = $this->actingAs($this->frontDeskUser)
            ->getJson('/api/v1/services/manage?is_active=0&per_page=100');

        $managementResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $managementIds = collect($managementResponse->json('data.data'))->pluck('id');

        $this->assertTrue($managementIds->contains($service->id));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function servicePayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Frontdesk Created Service',
            'description' => 'Service description',
            'price_label' => 'P1,000-P1,500',
            'price_fixed' => 1200,
            'duration' => '45 mins',
            'estimated_duration' => '45-60 mins',
            'category' => 'maintenance',
            'features' => ['Oil change', 'Filter check'],
            'includes' => ['Synthetic oil', 'Labor'],
            'rating' => 4.6,
            'rating_count' => 24,
            'queue_label' => '2-3 in queue',
            'recommended' => true,
            'recommended_note' => 'Popular choice',
            'is_active' => true,
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createService(array $overrides = []): ServiceCatalog
    {
        return ServiceCatalog::query()->create($this->servicePayload($overrides));
    }
}
