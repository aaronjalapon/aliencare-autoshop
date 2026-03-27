<?php

use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->withHeaders(['Referer' => 'http://localhost/']);
});

test('profile information is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->getJson('/api/settings/profile');

    $response->assertOk()
        ->assertJsonStructure(['user', 'mustVerifyEmail']);
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patchJson('/api/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response->assertOk()
        ->assertJson(['message' => 'Profile updated'])
        ->assertJsonStructure(['user', 'message']);

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patchJson('/api/settings/profile', [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response->assertOk()
        ->assertJson(['message' => 'Profile updated']);

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->deleteJson('/api/settings/profile', [
            'password' => 'password',
        ]);

    $response->assertOk()
        ->assertJson(['message' => 'Account deleted']);

    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->deleteJson('/api/settings/profile', [
            'password' => 'wrong-password',
        ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    expect($user->fresh())->not->toBeNull();
});
