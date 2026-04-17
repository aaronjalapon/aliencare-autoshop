<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withHeaders(['Referer' => 'http://localhost/']);
});

test('profile information is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->getJson('/api/settings/profile');

    $response->assertOk()
        ->assertJsonStructure(['user', 'mustVerifyEmail'])
        ->assertJsonPath('user.phone_number', null)
        ->assertJsonPath('user.address', null);
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patchJson('/api/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone_number' => '09171234567',
            'address' => '123 Main St',
        ]);

    $response->assertOk()
        ->assertJson(['message' => 'Profile updated'])
        ->assertJsonStructure(['user', 'message']);

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->phone_number)->toBe('09171234567');
    expect($user->address)->toBe('123 Main St');
    expect($user->email_verified_at)->toBeNull();
});

test('phone and address can be updated to optional empty values', function () {
    $user = User::factory()->create([
        'phone_number' => '09170000000',
        'address' => 'Initial Address',
    ]);

    $response = $this
        ->actingAs($user)
        ->patchJson('/api/settings/profile', [
            'name' => 'Test User',
            'email' => $user->email,
            'phone_number' => '',
            'address' => '',
        ]);

    $response->assertOk()
        ->assertJson(['message' => 'Profile updated']);

    $user->refresh();

    expect([null, ''])->toContain($user->phone_number);
    expect([null, ''])->toContain($user->address);
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
