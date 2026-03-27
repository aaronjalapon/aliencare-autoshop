<?php

declare(strict_types=1);

namespace App\Providers;

use App\Events\LowStockAlert;
use App\Events\ReservationUpdated;
use App\Events\StockUpdated;
use App\Listeners\HandleLowStockAlert;
use App\Listeners\LogReservationActivity;
use App\Listeners\LogStockTransaction;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],

        // Inventory Events
        StockUpdated::class => [
            LogStockTransaction::class,
        ],

        LowStockAlert::class => [
            HandleLowStockAlert::class,
        ],

        ReservationUpdated::class => [
            LogReservationActivity::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
