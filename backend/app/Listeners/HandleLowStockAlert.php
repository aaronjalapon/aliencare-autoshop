<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\LowStockAlert;
use App\Models\Report;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class HandleLowStockAlert implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(LowStockAlert $event): void
    {
        try {
            $inventory = $event->inventory;

            // Create low stock alert report
            $alertData = [
                'item_id' => $inventory->item_id,
                'item_name' => $inventory->item_name,
                'category' => $inventory->category,
                'current_stock' => $inventory->stock,
                'reorder_level' => $inventory->reorder_level,
                'supplier' => $inventory->supplier,
                'unit_price' => $inventory->unit_price,
                'alert_level' => $event->alertLevel,
                'estimated_cost_to_reorder' => ($inventory->reorder_level * 2) * $inventory->unit_price,
                'suggested_order_quantity' => $inventory->reorder_level * 2,
                'stock_out_risk' => $inventory->stock == 0 ? 'immediate' : 'high',
            ];

            Report::create([
                'report_type' => 'low_stock_alert',
                'generated_date' => $event->timestamp,
                'report_date' => now()->toDateString(),
                'data_summary' => $alertData,
                'generated_by' => 'System - Auto Alert',
            ]);

            // Log the alert
            Log::warning('Low stock alert generated', [
                'item_id' => $inventory->item_id,
                'item_name' => $inventory->item_name,
                'current_stock' => $inventory->stock,
                'reorder_level' => $inventory->reorder_level,
                'alert_level' => $event->alertLevel,
            ]);

            // Create Alert record in database
            $urgency = $event->alertLevel === 'critical' ? 'critical' : 'high';
            $alertType = $inventory->stock == 0 ? 'out_of_stock' : 'low_stock';

            $message = $urgency === 'critical'
                ? "CRITICAL: {$inventory->item_name} is out of stock! Immediate restocking required."
                : "HIGH PRIORITY: {$inventory->item_name} stock is critically low ({$inventory->stock} units remaining).";

            \App\Models\Alert::firstOrCreate(
                [
                    'item_id' => $inventory->item_id,
                    'alert_type' => $alertType,
                    'acknowledged' => false,
                ],
                [
                    'item_name' => $inventory->item_name,
                    'current_stock' => $inventory->stock,
                    'reorder_level' => $inventory->reorder_level,
                    'category' => $inventory->category,
                    'supplier' => $inventory->supplier,
                    'urgency' => $urgency,
                    'message' => $message,
                ]
            );

            // Here you could send notifications to managers, procurement team, etc.
            // For example:
            // $users = User::where('role', 'inventory_manager')->get();
            // Notification::send($users, new LowStockNotification($inventory));

        } catch (\Exception $e) {
            Log::error('Failed to handle low stock alert: '.$e->getMessage(), [
                'inventory_id' => $event->inventory->inventory_id,
                'alert_level' => $event->alertLevel,
            ]);
        }
    }
}
