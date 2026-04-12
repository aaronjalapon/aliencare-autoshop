<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Customer;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerOnboardingApiTest extends TestCase
{
    use RefreshDatabase;

    private function customerUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'customer',
        ], $overrides));
    }

    public function test_onboarding_status_returns_incomplete_when_customer_profile_missing(): void
    {
        $user = $this->customerUser();

        $this->actingAs($user)
            ->getJson('/api/v1/customer/onboarding-status')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.has_customer_profile', false)
            ->assertJsonPath('data.onboarding_completed', false)
            ->assertJsonPath('data.customer', null);
    }

    public function test_complete_onboarding_creates_customer_and_vehicle(): void
    {
        $user = $this->customerUser([
            'email' => 'new-customer@example.com',
        ]);

        $payload = [
            'first_name' => 'Sam',
            'last_name' => 'Driver',
            'phone_number' => '09171234567',
            'address' => '123 Main St',
            'license_number' => 'A12-3456-789101',
            'preferred_contact_method' => 'sms',
            'special_notes' => 'Please call before service.',
            'vehicles' => [
                [
                    'plate_number' => 'NEW 1234',
                    'make' => 'Toyota',
                    'model' => 'Vios',
                    'year' => 2022,
                    'color' => 'White',
                    'vin' => 'VIN-NEW-1234',
                ],
            ],
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/v1/customer/onboarding', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'new-customer@example.com')
            ->assertJsonPath('data.preferred_contact_method', 'sms')
            ->assertJsonPath('data.special_notes', 'Please call before service.');

        $customer = Customer::query()->where('email', 'new-customer@example.com')->first();

        $this->assertNotNull($customer);
        $this->assertNotNull($customer?->onboarding_completed_at);

        $this->assertDatabaseHas('vehicles', [
            'customer_id' => $customer?->id,
            'plate_number' => 'NEW 1234',
            'make' => 'Toyota',
            'model' => 'Vios',
        ]);
    }

    public function test_complete_onboarding_updates_existing_customer_and_existing_plate_vehicle(): void
    {
        $user = $this->customerUser([
            'email' => 'existing-customer@example.com',
        ]);

        $customer = Customer::factory()->create([
            'email' => 'existing-customer@example.com',
            'first_name' => 'Old',
            'last_name' => 'Name',
            'phone_number' => '09000000000',
        ]);

        $vehicle = Vehicle::factory()->create([
            'customer_id' => $customer->id,
            'plate_number' => 'EXIST 001',
            'make' => 'Honda',
            'model' => 'City',
            'year' => 2020,
        ]);

        $payload = [
            'first_name' => 'Updated',
            'last_name' => 'Customer',
            'phone_number' => '09998887777',
            'preferred_contact_method' => 'email',
            'special_notes' => 'Updated notes',
            'vehicles' => [
                [
                    'plate_number' => 'EXIST 001',
                    'make' => 'Honda',
                    'model' => 'Civic',
                    'year' => 2023,
                    'color' => 'Black',
                ],
            ],
        ];

        $this->actingAs($user)
            ->postJson('/api/v1/customer/onboarding', $payload)
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.first_name', 'Updated')
            ->assertJsonPath('data.preferred_contact_method', 'email');

        $customer->refresh();
        $vehicle->refresh();

        $this->assertSame('Updated', $customer->first_name);
        $this->assertSame('Customer', $customer->last_name);
        $this->assertSame('09998887777', $customer->phone_number);
        $this->assertNotNull($customer->onboarding_completed_at);

        $this->assertSame('Civic', $vehicle->model);
        $this->assertSame(2023, $vehicle->year);
    }

    public function test_complete_onboarding_accepts_empty_optional_fields(): void
    {
        $user = $this->customerUser([
            'email' => 'empty-optional@example.com',
        ]);

        $payload = [
            'first_name' => 'Empty',
            'last_name' => 'Optional',
            'phone_number' => '09170000000',
            'address' => '   ',
            'license_number' => '',
            'preferred_contact_method' => 'sms',
            'special_notes' => '',
            'vehicles' => [
                [
                    'plate_number' => 'EMP 1001',
                    'make' => 'Hyundai',
                    'model' => 'Accent',
                    'year' => 2021,
                    'color' => ' ',
                    'vin' => '',
                ],
            ],
        ];

        $this->actingAs($user)
            ->postJson('/api/v1/customer/onboarding', $payload)
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.address', null)
            ->assertJsonPath('data.license_number', null)
            ->assertJsonPath('data.special_notes', null);

        $customer = Customer::query()->where('email', 'empty-optional@example.com')->first();

        $this->assertNotNull($customer);
        $this->assertNull($customer?->address);
        $this->assertNull($customer?->license_number);
        $this->assertNull($customer?->special_notes);

        $vehicle = Vehicle::query()->where('plate_number', 'EMP 1001')->first();

        $this->assertNotNull($vehicle);
        $this->assertNull($vehicle?->color);
        $this->assertNull($vehicle?->vin);
    }

    public function test_customer_can_update_own_special_information(): void
    {
        $user = $this->customerUser([
            'email' => 'owner@example.com',
        ]);

        $customer = Customer::factory()->create([
            'email' => 'owner@example.com',
        ]);

        $this->actingAs($user)
            ->putJson("/api/v1/customers/{$customer->id}/special-info", [
                'preferred_contact_method' => 'call',
                'special_notes' => 'Ring me directly.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.preferred_contact_method', 'call')
            ->assertJsonPath('data.special_notes', 'Ring me directly.');
    }

    public function test_customer_cannot_update_other_customer_personal_info(): void
    {
        $user = $this->customerUser([
            'email' => 'self@example.com',
        ]);

        Customer::factory()->create([
            'email' => 'self@example.com',
        ]);

        $otherCustomer = Customer::factory()->create();

        $this->actingAs($user)
            ->putJson("/api/v1/customers/{$otherCustomer->id}/personal-info", [
                'phone_number' => '09001112222',
            ])
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'You are not allowed to access this customer.');
    }

    public function test_customer_cannot_update_other_customers_vehicle(): void
    {
        $user = $this->customerUser([
            'email' => 'self-vehicle@example.com',
        ]);

        $selfCustomer = Customer::factory()->create([
            'email' => 'self-vehicle@example.com',
        ]);

        $otherCustomer = Customer::factory()->create();

        Vehicle::factory()->create([
            'customer_id' => $selfCustomer->id,
            'plate_number' => 'SELF 222',
        ]);

        $otherVehicle = Vehicle::factory()->create([
            'customer_id' => $otherCustomer->id,
            'plate_number' => 'OTH 999',
        ]);

        $this->actingAs($user)
            ->putJson("/api/v1/vehicles/{$otherVehicle->id}", [
                'make' => 'Nissan',
            ])
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'You are not allowed to modify this vehicle.');
    }

    public function test_customer_cannot_add_vehicle_to_other_customer_record(): void
    {
        $user = $this->customerUser([
            'email' => 'vehicle-owner@example.com',
        ]);

        $selfCustomer = Customer::factory()->create([
            'email' => 'vehicle-owner@example.com',
        ]);

        $otherCustomer = Customer::factory()->create();

        $this->actingAs($user)
            ->postJson("/api/v1/customers/{$otherCustomer->id}/vehicles", [
                'customer_id' => $otherCustomer->id,
                'plate_number' => 'FORGE 123',
                'make' => 'Toyota',
                'model' => 'Corolla',
                'year' => 2024,
            ])
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'You are not allowed to modify this customer vehicle.');

        $this->assertDatabaseMissing('vehicles', [
            'plate_number' => 'FORGE 123',
        ]);
    }
}
