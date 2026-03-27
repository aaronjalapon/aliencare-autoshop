<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests cannot access the user endpoint', function () {
    $this->getJson('/api/user')->assertUnauthorized();
});

test('authenticated users can retrieve their data', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertOk()
        ->assertJsonStructure(['id', 'name', 'email']);
});
