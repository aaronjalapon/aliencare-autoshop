<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class SensitiveEndpointAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_cannot_access_sensitive_endpoints(): void
    {
        Config::set('inventory.security.restrict_sensitive_endpoints', false);

        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/archives')
            ->assertStatus(403);

        $this->actingAs($user)
            ->getJson('/api/v1/transactions')
            ->assertStatus(403);

        $this->actingAs($user)
            ->getJson('/api/v1/reports')
            ->assertStatus(403);
    }

    public function test_verified_user_can_access_sensitive_endpoints_when_restriction_disabled(): void
    {
        Config::set('inventory.security.restrict_sensitive_endpoints', false);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/archives')
            ->assertStatus(200);

        $this->actingAs($user)
            ->getJson('/api/v1/transactions')
            ->assertStatus(200);

        $this->actingAs($user)
            ->getJson('/api/v1/reports')
            ->assertStatus(200);
    }

    public function test_verified_user_is_denied_when_restriction_enabled_and_not_allowlisted(): void
    {
        Config::set('inventory.security.restrict_sensitive_endpoints', true);
        Config::set('inventory.security.sensitive_user_ids', []);
        Config::set('inventory.security.sensitive_user_emails', []);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/reports')
            ->assertStatus(403);
    }

    public function test_verified_user_can_access_when_allowlisted_by_email(): void
    {
        $user = User::factory()->create();

        Config::set('inventory.security.restrict_sensitive_endpoints', true);
        Config::set('inventory.security.sensitive_user_ids', []);
        Config::set('inventory.security.sensitive_user_emails', [strtolower($user->email)]);

        $this->actingAs($user)
            ->getJson('/api/v1/reports')
            ->assertStatus(200);
    }
}
