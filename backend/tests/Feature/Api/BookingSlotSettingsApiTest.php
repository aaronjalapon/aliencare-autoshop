<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingSlotSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/admin/booking-slots')
            ->assertStatus(401);
    }

    public function test_index_forbids_non_admin_users(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->actingAs($user)
            ->getJson('/api/v1/admin/booking-slots')
            ->assertStatus(403);
    }

    public function test_index_returns_booking_slot_settings_for_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->getJson('/api/v1/admin/booking-slots');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'slots' => [
                        '*' => ['id', 'time', 'label', 'capacity', 'is_active', 'sort_order'],
                    ],
                ],
            ]);
    }

    public function test_update_replaces_slot_settings_for_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $payload = [
            'slots' => [
                ['time' => '09:30', 'capacity' => 2, 'is_active' => true, 'sort_order' => 1],
                ['time' => '10:15', 'capacity' => 1, 'is_active' => false, 'sort_order' => 2],
            ],
        ];

        $response = $this->actingAs($admin)
            ->putJson('/api/v1/admin/booking-slots', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.slots.0.time', '09:30')
            ->assertJsonPath('data.slots.0.capacity', 2)
            ->assertJsonPath('data.slots.1.time', '10:15')
            ->assertJsonPath('data.slots.1.is_active', false);

        $this->assertDatabaseHas('booking_slots', [
            'time' => '09:30',
            'capacity' => 2,
            'is_active' => 1,
        ]);

        $this->assertDatabaseHas('booking_slots', [
            'time' => '10:15',
            'capacity' => 1,
            'is_active' => 0,
        ]);

        $this->assertDatabaseMissing('booking_slots', [
            'time' => '12:30',
        ]);
    }
}
