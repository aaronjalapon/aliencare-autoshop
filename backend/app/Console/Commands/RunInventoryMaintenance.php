<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Events\LowStockAlert;
use App\Jobs\GenerateAutomatedReports;
use App\Models\Inventory;
use Illuminate\Console\Command;

class RunInventoryMaintenance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inventory:maintenance {--type=all : Type of maintenance to run (all, reports, alerts, cleanup)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run inventory maintenance tasks including reports generation and alerts';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $type = $this->option('type');

        $this->info('Starting inventory maintenance...');

        match ($type) {
            'all' => $this->runAllMaintenance(),
            'reports' => $this->generateReports(),
            'alerts' => $this->checkAlerts(),
            'cleanup' => $this->cleanupOldData(),
            default => $this->error("Unknown maintenance type: {$type}")
        };

        $this->info('Inventory maintenance completed!');

        return Command::SUCCESS;
    }

    /**
     * Run all maintenance tasks.
     */
    private function runAllMaintenance(): void
    {
        $this->generateReports();
        $this->checkAlerts();
        $this->cleanupOldData();
        $this->updateStockMetrics();
    }

    /**
     * Generate automated reports.
     */
    private function generateReports(): void
    {
        $this->info('Generating automated reports...');

        // Generate daily usage report for yesterday
        GenerateAutomatedReports::dispatch('daily_usage', now()->subDay());
        $this->line('✓ Daily usage report queued');

        // Generate monthly procurement report if it's the first day of the month
        if (now()->day === 1) {
            GenerateAutomatedReports::dispatch('monthly_procurement', now()->subMonth());
            $this->line('✓ Monthly procurement report queued');
        }

        // Generate reconciliation report
        GenerateAutomatedReports::dispatch('reconciliation', now());
        $this->line('✓ Reconciliation report queued');
    }

    /**
     * Check for low stock alerts.
     */
    private function checkAlerts(): void
    {
        $this->info('Checking for low stock alerts...');

        $lowStockItems = Inventory::lowStock()->active()->get();

        if ($lowStockItems->isEmpty()) {
            $this->line('✓ No low stock items found');

            return;
        }

        $this->warn("Found {$lowStockItems->count()} low stock items:");

        foreach ($lowStockItems as $item) {
            $urgency = $item->stock == 0 ? 'CRITICAL' : 'LOW';
            $this->line("  [{$urgency}] {$item->item_id} - {$item->item_name} (Stock: {$item->stock}, Reorder: {$item->reorder_level})");

            // Fire low stock alert event
            event(new LowStockAlert($item));
        }

        // Generate low stock alert report
        GenerateAutomatedReports::dispatch('low_stock_check', now());
        $this->line('✓ Low stock alert report queued');
    }

    /**
     * Clean up old data.
     */
    private function cleanupOldData(): void
    {
        $this->info('Cleaning up old data...');

        // Clean up old reports (keep last 12 months)
        $cutoffDate = now()->subMonths(12);

        $deletedReports = \App\Models\Report::where('generated_date', '<', $cutoffDate)->count();
        \App\Models\Report::where('generated_date', '<', $cutoffDate)->delete();

        if ($deletedReports > 0) {
            $this->line("✓ Deleted {$deletedReports} old reports");
        }

        // Clean up old archive entries (keep last 24 months)
        $archiveCutoffDate = now()->subMonths(24);

        $deletedArchives = \App\Models\Archive::where('archived_date', '<', $archiveCutoffDate)->count();
        \App\Models\Archive::where('archived_date', '<', $archiveCutoffDate)->delete();

        if ($deletedArchives > 0) {
            $this->line("✓ Deleted {$deletedArchives} old archive entries");
        }

        // Clean up expired reservations
        $expiredReservations = \App\Models\Reservation::expired()->count();
        \App\Models\Reservation::expired()->update(['status' => 'cancelled']);

        if ($expiredReservations > 0) {
            $this->line("✓ Cancelled {$expiredReservations} expired reservations");
        }
    }

    /**
     * Update stock metrics and health indicators.
     */
    private function updateStockMetrics(): void
    {
        $this->info('Updating stock metrics...');

        $totalItems = Inventory::active()->count();
        $lowStockCount = Inventory::lowStock()->active()->count();
        $outOfStockCount = Inventory::where('stock', 0)->active()->count();
        $totalValue = Inventory::active()->sum(\Illuminate\Support\Facades\DB::raw('stock * unit_price'));

        $healthScore = $this->calculateInventoryHealthScore($totalItems, $lowStockCount, $outOfStockCount);

        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Active Items', number_format($totalItems)],
                ['Low Stock Items', number_format($lowStockCount)],
                ['Out of Stock Items', number_format($outOfStockCount)],
                ['Total Inventory Value', '$'.number_format($totalValue, 2)],
                ['Inventory Health Score', $healthScore.'%'],
            ]
        );

        $this->line('✓ Stock metrics updated');
    }

    /**
     * Calculate inventory health score.
     */
    private function calculateInventoryHealthScore(int $totalItems, int $lowStockCount, int $outOfStockCount): int
    {
        if ($totalItems === 0) {
            return 0;
        }

        $lowStockPenalty = ($lowStockCount / $totalItems) * 30;
        $outOfStockPenalty = ($outOfStockCount / $totalItems) * 50;

        $healthScore = 100 - $lowStockPenalty - $outOfStockPenalty;

        return max(0, min(100, round($healthScore)));
    }
}
