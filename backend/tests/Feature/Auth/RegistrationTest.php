<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('new users can register', function () {
    $response = $this->postJson('/api/auth/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response
        ->assertCreated()
        ->assertJson(['message' => 'Registration successful'])
        ->assertJsonStructure(['message', 'user']);
});
