<?php

use App\Models\Inventory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can create an inventory item', function () {
    $inventory = Inventory::factory()->create([
        'item_name' => 'Test Item',
        'stock' => 10,
        'reorder_level' => 5,
    ]);

    expect($inventory->item_name)->toBe('Test Item');
    expect($inventory->stock)->toBe(10);
    expect($inventory->reorder_level)->toBe(5);
});

it('can detect low stock items', function () {
    $lowStockItem = Inventory::factory()->create([
        'item_name' => 'Low Stock Item',
        'stock' => 3,
        'reorder_level' => 5,
    ]);

    $adequateStockItem = Inventory::factory()->create([
        'item_name' => 'Adequate Stock Item',
        'stock' => 10,
        'reorder_level' => 5,
    ]);

    expect($lowStockItem->isLowStock())->toBeTrue();
    expect($adequateStockItem->isLowStock())->toBeFalse();
});

it('can get stock status for requested quantity', function () {
    $inventory = Inventory::factory()->create([
        'item_name' => 'Test Item',
        'stock' => 10,
    ]);

    expect($inventory->getStockStatus(5))->toBe('Available');
    expect($inventory->getStockStatus(10))->toBe('Available');
    expect($inventory->getStockStatus(15))->toBe('Partial');

    $inventory->stock = 0;
    expect($inventory->getStockStatus(5))->toBe('Backorder');
});
