<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withHeaders(['Referer' => 'http://localhost/']);
});

test('password can be confirmed', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/auth/confirm-password', [
        'password' => 'password',
    ]);

    $response->assertOk()
        ->assertJson(['message' => 'Password confirmed']);
});

test('password is not confirmed with invalid password', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/auth/confirm-password', [
        'password' => 'wrong-password',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});
