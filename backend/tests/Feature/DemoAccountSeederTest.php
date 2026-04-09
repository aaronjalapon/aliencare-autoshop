<?php

declare(strict_types=1);

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Enums\VehicleApprovalStatus;
use App\Models\Customer;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\DemoAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('demo account seeder provisions admin, frontdesk and customer access records', function () {
    $this->seed(DemoAccountSeeder::class);

    $admin = User::where('email', DemoAccountSeeder::ADMIN_EMAIL)->first();
    $frontdesk = User::where('email', DemoAccountSeeder::FRONTDESK_EMAIL)->first();
    $customerUser = User::where('email', DemoAccountSeeder::CUSTOMER_EMAIL)->first();
    $customer = Customer::where('email', DemoAccountSeeder::CUSTOMER_EMAIL)->first();
    $vehicle = Vehicle::where('plate_number', DemoAccountSeeder::CUSTOMER_PLATE_NUMBER)->first();

    $this->assertNotNull($admin);
    $this->assertNotNull($frontdesk);
    $this->assertNotNull($customerUser);
    $this->assertNotNull($customer);
    $this->assertNotNull($vehicle);

    $this->assertSame(UserRole::Admin, $admin->role);
    $this->assertSame(UserRole::FrontDesk, $frontdesk->role);
    $this->assertSame(UserRole::Customer, $customerUser->role);

    $this->assertTrue(Hash::check(DemoAccountSeeder::PASSWORD, $admin->password));
    $this->assertTrue(Hash::check(DemoAccountSeeder::PASSWORD, $frontdesk->password));
    $this->assertTrue(Hash::check(DemoAccountSeeder::PASSWORD, $customerUser->password));
    $this->assertSame(AccountStatus::Approved, $customer->account_status);
    $this->assertSame($frontdesk->id, $customer->approved_by);
    $this->assertNotNull($customer->approved_at);
    $this->assertSame($customer->id, $vehicle->customer_id);
    $this->assertSame(VehicleApprovalStatus::Approved, $vehicle->approval_status);
    $this->assertSame($frontdesk->id, $vehicle->approved_by);
});

test('demo account seeder can be re-run safely', function () {
    $this->seed(DemoAccountSeeder::class);
    $this->seed(DemoAccountSeeder::class);

    $this->assertDatabaseCount('users', 3);
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('vehicles', 1);
});
