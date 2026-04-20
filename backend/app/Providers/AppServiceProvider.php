<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\Repositories\AlertRepositoryInterface;
use App\Contracts\Repositories\ArchiveRepositoryInterface;
use App\Contracts\Repositories\CustomerRepositoryInterface;
use App\Contracts\Repositories\InventoryRepositoryInterface;
use App\Contracts\Repositories\JobOrderRepositoryInterface;
use App\Contracts\Repositories\ReportRepositoryInterface;
use App\Contracts\Repositories\ReservationRepositoryInterface;
use App\Contracts\Repositories\StockTransactionRepositoryInterface;
use App\Contracts\Repositories\VehicleRepositoryInterface;
use App\Contracts\Services\AlertServiceInterface;
use App\Contracts\Services\CustomerServiceInterface;
use App\Contracts\Services\InventoryServiceInterface;
use App\Contracts\Services\JobOrderServiceInterface;
use App\Contracts\Services\ReportServiceInterface;
use App\Contracts\Services\ReservationServiceInterface;
use App\Contracts\Services\VehicleServiceInterface;
use App\Enums\UserRole;
use App\Models\User;
use App\Repositories\Eloquent\AlertRepository;
use App\Repositories\Eloquent\ArchiveRepository;
use App\Repositories\Eloquent\CustomerRepository;
use App\Repositories\Eloquent\InventoryRepository;
use App\Repositories\Eloquent\JobOrderRepository;
use App\Repositories\Eloquent\ReportRepository;
use App\Repositories\Eloquent\ReservationRepository;
use App\Repositories\Eloquent\StockTransactionRepository;
use App\Repositories\Eloquent\VehicleRepository;
use App\Services\AlertService;
use App\Services\CustomerService;
use App\Services\InventoryService;
use App\Services\JobOrderService;
use App\Services\ReportService;
use App\Services\ReservationService;
use App\Services\VehicleService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Application Service Provider.
 *
 * Registers application services and their bindings to the service container.
 */
class AppServiceProvider extends ServiceProvider
{
    /**
     * All of the container bindings that should be registered.
     *
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        // Repository bindings
        InventoryRepositoryInterface::class => InventoryRepository::class,
        ReservationRepositoryInterface::class => ReservationRepository::class,
        AlertRepositoryInterface::class => AlertRepository::class,
        ReportRepositoryInterface::class => ReportRepository::class,
        StockTransactionRepositoryInterface::class => StockTransactionRepository::class,
        ArchiveRepositoryInterface::class => ArchiveRepository::class,
        JobOrderRepositoryInterface::class => JobOrderRepository::class,
        CustomerRepositoryInterface::class => CustomerRepository::class,
        VehicleRepositoryInterface::class => VehicleRepository::class,

        // Service bindings
        InventoryServiceInterface::class => InventoryService::class,
        ReservationServiceInterface::class => ReservationService::class,
        ReportServiceInterface::class => ReportService::class,
        AlertServiceInterface::class => AlertService::class,
        JobOrderServiceInterface::class => JobOrderService::class,
        CustomerServiceInterface::class => CustomerService::class,
        VehicleServiceInterface::class => VehicleService::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Service interface bindings are handled via the $bindings property above.
        // For more complex bindings, you can add them here:

        // Example of singleton binding:
        // $this->app->singleton(InventoryServiceInterface::class, InventoryService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->warnIfXenditConfigLooksInvalid();

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(200)->by($request->user()?->id ?: $request->ip());
        });

        Gate::define('view-archives', fn (User $user): bool => $this->canManageInventoryWorkspace($user));
        Gate::define('view-transactions', fn (User $user): bool => $this->canManageInventoryWorkspace($user));
        Gate::define('view-reports', fn (User $user): bool => $this->canManageInventoryWorkspace($user));
        Gate::define('generate-reports', fn (User $user): bool => $this->canManageInventoryWorkspace($user));
        Gate::define('manage-inventory', fn (User $user): bool => $this->canManageInventoryWorkspace($user));

        // CIM gates
        Gate::define('approve-customers', fn (User $user): bool => $this->canAccessSensitiveEndpoints($user));
        Gate::define('reject-customers', fn (User $user): bool => $this->canAccessSensitiveEndpoints($user));
        Gate::define('delete-customers', fn (User $user): bool => $this->canAccessSensitiveEndpoints($user));
        Gate::define('approve-vehicles', fn (User $user): bool => $this->canAccessSensitiveEndpoints($user));
        Gate::define('view-audit-logs', fn (User $user): bool => $this->canAccessSensitiveEndpoints($user));
        Gate::define('link-transactions', fn (User $user): bool => $this->canAccessSensitiveEndpoints($user));
        Gate::define('update-transactions', fn (User $user): bool => $this->canAccessSensitiveEndpoints($user));
        Gate::define('manage-booking-slots', fn (User $user): bool => $this->canManageBookingSlots($user));
        Gate::define('manage-services', fn (User $user): bool => $this->canManageServices($user));
        Gate::define('manage-job-orders', fn (User $user): bool => $this->canManageJobOrders($user));
        Gate::define('manage-pos', fn (User $user): bool => $this->canManagePos($user));
    }

    private function canManageBookingSlots(User $user): bool
    {
        return $this->canAccessSensitiveEndpoints($user) && $user->role === UserRole::Admin;
    }

    private function canManageServices(User $user): bool
    {
        if (! $this->canAccessSensitiveEndpoints($user)) {
            return false;
        }

        return in_array($user->role, [UserRole::Admin, UserRole::FrontDesk], true)
            || in_array($user->role, [UserRole::Admin->value, UserRole::FrontDesk->value], true);
    }

    private function canManageJobOrders(User $user): bool
    {
        if (! $this->canAccessSensitiveEndpoints($user)) {
            return false;
        }

        return in_array($user->role, [UserRole::Admin, UserRole::FrontDesk], true)
            || in_array($user->role, [UserRole::Admin->value, UserRole::FrontDesk->value], true);
    }

    private function canManagePos(User $user): bool
    {
        if (! $this->canAccessSensitiveEndpoints($user)) {
            return false;
        }

        return in_array($user->role, [UserRole::Admin, UserRole::FrontDesk], true)
            || in_array($user->role, [UserRole::Admin->value, UserRole::FrontDesk->value], true);
    }

    private function canManageInventoryWorkspace(User $user): bool
    {
        if (! $this->canAccessSensitiveEndpoints($user)) {
            return false;
        }

        return in_array($user->role, [UserRole::Admin, UserRole::FrontDesk], true)
            || in_array($user->role, [UserRole::Admin->value, UserRole::FrontDesk->value], true);
    }

    private function warnIfXenditConfigLooksInvalid(): void
    {
        $secretKey = trim((string) config('xendit.secret_key', ''));

        if ($secretKey === '' || $this->looksLikePlaceholderXenditSecret($secretKey)) {
            Log::warning('Xendit secret key is missing or a placeholder. Online payment endpoints will return 503 until fixed.');

            return;
        }

        if (str_starts_with(strtolower($secretKey), 'xnd_public_')) {
            Log::warning('Xendit secret key appears to be a public key. Use XENDIT_SECRET_KEY for backend API requests.');
        }
    }

    private function looksLikePlaceholderXenditSecret(string $secretKey): bool
    {
        $normalized = strtolower(trim($secretKey));

        return str_contains($normalized, 'rotate_in_xendit')
            || str_contains($normalized, 'set_here')
            || str_contains($normalized, 'your_xendit_secret_key');
    }

    private function canAccessSensitiveEndpoints(User $user): bool
    {
        // Sensitive read/generate access requires a verified account.
        if ($user->email_verified_at === null) {
            return false;
        }

        $securityConfig = config('inventory.security', []);
        $isRestricted = (bool) ($securityConfig['restrict_sensitive_endpoints'] ?? false);

        if (! $isRestricted) {
            return true;
        }

        /** @var array<int, int> $allowedIds */
        $allowedIds = $securityConfig['sensitive_user_ids'] ?? [];
        /** @var array<int, string> $allowedEmails */
        $allowedEmails = $securityConfig['sensitive_user_emails'] ?? [];

        if (empty($allowedIds) && empty($allowedEmails)) {
            return false;
        }

        if (in_array((int) $user->id, $allowedIds, true)) {
            return true;
        }

        return in_array(strtolower((string) $user->email), $allowedEmails, true);
    }
}
