<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Enums\VehicleApprovalStatus;
use App\Models\Customer;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class DemoAccountSeeder extends Seeder
{
    public const ADMIN_EMAIL = 'admin@aliencare.test';

    public const FRONTDESK_EMAIL = 'frontdesk@aliencare.test';

    public const CUSTOMER_EMAIL = 'customer@aliencare.test';

    public const PASSWORD = 'AlienCare123!';

    public const CUSTOMER_PLATE_NUMBER = 'ACR 2026';

    public function run(): void
    {
        User::updateOrCreate(
            ['email' => self::ADMIN_EMAIL],
            [
                'name' => 'AlienCare Admin',
                'email_verified_at' => now(),
                'password' => self::PASSWORD,
                'role' => UserRole::Admin->value,
            ],
        );

        $frontdeskUser = User::updateOrCreate(
            ['email' => self::FRONTDESK_EMAIL],
            [
                'name' => 'AlienCare Front Desk',
                'email_verified_at' => now(),
                'password' => self::PASSWORD,
                'role' => UserRole::FrontDesk->value,
            ],
        );

        User::updateOrCreate(
            ['email' => self::CUSTOMER_EMAIL],
            [
                'name' => 'AlienCare Demo Customer',
                'email_verified_at' => now(),
                'password' => self::PASSWORD,
                'role' => UserRole::Customer->value,
            ],
        );

        $customer = Customer::updateOrCreate(
            ['email' => self::CUSTOMER_EMAIL],
            [
                'first_name' => 'Demo',
                'last_name' => 'Customer',
                'phone_number' => '09175550101',
                'license_number' => 'N01-23-4567890',
                'account_status' => AccountStatus::Approved->value,
                'approved_by' => $frontdeskUser->id,
                'approved_at' => now(),
                'rejection_reason' => null,
            ],
        );

        Vehicle::updateOrCreate(
            ['plate_number' => self::CUSTOMER_PLATE_NUMBER],
            [
                'customer_id' => $customer->id,
                'make' => 'Toyota',
                'model' => 'Vios',
                'year' => 2022,
                'color' => 'Silver',
                'approval_status' => VehicleApprovalStatus::Approved->value,
                'approved_by' => $frontdeskUser->id,
                'approved_at' => now(),
                'vin' => 'JTDKB20U793123456',
            ],
        );
    }
}
