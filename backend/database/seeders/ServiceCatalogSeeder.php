<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ServiceCatalog;
use Illuminate\Database\Seeder;

class ServiceCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            [
                'name' => 'Premium Car Wash',
                'description' => 'Complete exterior and interior car wash with premium products.',
                'price_label' => 'P300–P800',
                'price_fixed' => 550.00,
                'duration' => '30 mins',
                'estimated_duration' => '25–35 mins',
                'category' => 'cleaning',
                'features' => ['Exterior + Interior'],
                'includes' => ['Exterior foam wash', 'Interior vacuum', 'Dashboard wipe'],
                'rating' => 4.5,
                'rating_count' => 183,
                'queue_label' => '2-3 In Que',
                'recommended' => false,
                'recommended_note' => null,
            ],
            [
                'name' => 'Change Oil',
                'description' => 'Full synthetic oil change with filter replacement and multi-point inspection.',
                'price_label' => 'P300–P800',
                'price_fixed' => 1200.00,
                'duration' => '30 mins',
                'estimated_duration' => '45–60 mins',
                'category' => 'maintenance',
                'features' => ['Exterior + Interior'],
                'includes' => ['Synthetic oil refill', 'Oil filter replacement', '21-point inspection'],
                'rating' => 4.5,
                'rating_count' => 183,
                'queue_label' => '2-3 In Que',
                'recommended' => true,
                'recommended_note' => 'You last changed your oil 5 months ago',
            ],
            [
                'name' => 'Air-Con Repair',
                'description' => 'Full air conditioning diagnostics, repair, and refrigerant service.',
                'price_label' => 'P300–P800',
                'price_fixed' => 2500.00,
                'duration' => '30 mins',
                'estimated_duration' => '60–90 mins',
                'category' => 'repair',
                'features' => ['Exterior + Interior'],
                'includes' => ['AC diagnostics', 'Refrigerant top-up', 'Filter cleaning'],
                'rating' => 4.5,
                'rating_count' => 183,
                'queue_label' => '2-3 In Que',
                'recommended' => false,
                'recommended_note' => null,
            ],
            [
                'name' => 'Brake Inspection',
                'description' => 'Comprehensive brake system inspection with fluid top-up.',
                'price_label' => 'P500–P1200',
                'price_fixed' => 800.00,
                'duration' => '45 mins',
                'estimated_duration' => '40–50 mins',
                'category' => 'maintenance',
                'features' => ['Full inspection'],
                'includes' => ['Brake pad check', 'Rotor inspection', 'Brake fluid top-up'],
                'rating' => 4.7,
                'rating_count' => 120,
                'queue_label' => '1-2 In Que',
                'recommended' => false,
                'recommended_note' => null,
            ],
            [
                'name' => 'Full Detail',
                'description' => 'Premium full detailing service including engine bay cleaning.',
                'price_label' => 'P1500–P2500',
                'price_fixed' => 2000.00,
                'duration' => '3 hrs',
                'estimated_duration' => '2.5–3 hrs',
                'category' => 'cleaning',
                'features' => ['Interior + Exterior'],
                'includes' => ['Exterior wash', 'Interior deep clean', 'Engine bay clean'],
                'rating' => 4.9,
                'rating_count' => 210,
                'queue_label' => '1 In Que',
                'recommended' => false,
                'recommended_note' => null,
            ],
            [
                'name' => 'Battery Replacement',
                'description' => 'Battery testing and replacement with terminal cleaning.',
                'price_label' => 'P3000–P6000',
                'price_fixed' => 4500.00,
                'duration' => '30 mins',
                'estimated_duration' => '20–30 mins',
                'category' => 'repair',
                'features' => ['Test + Replace'],
                'includes' => ['Battery test', 'New battery install', 'Terminal cleaning'],
                'rating' => 4.8,
                'rating_count' => 95,
                'queue_label' => '1-2 In Que',
                'recommended' => false,
                'recommended_note' => null,
            ],
        ];

        foreach ($services as $service) {
            ServiceCatalog::updateOrCreate(
                ['name' => $service['name']],
                $service
            );
        }
    }
}
