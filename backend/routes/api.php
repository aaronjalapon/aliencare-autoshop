<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\ArchiveController;
use App\Http\Controllers\Api\BayController;
use App\Http\Controllers\Api\BookingSlotSettingsController;
use App\Http\Controllers\Api\CustomerBookingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\FrontDeskAccountController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\JobOrderController;
use App\Http\Controllers\Api\MechanicController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\ServiceCatalogController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::get('/health', [HealthController::class, 'index'])->name('health.check');

// Public customer self-registration
Route::post('/v1/customers/register', [CustomerController::class, 'register'])->name('api.v1.customers.register');

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    // Guest routes
    Route::post('/register', [RegisteredUserController::class, 'store'])->name('register');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login');
    Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');
    Route::post('/reset-password', [NewPasswordController::class, 'store'])->name('password.store');

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
        Route::get('/verify-email', EmailVerificationPromptController::class)->name('verification.notice');
        Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
            ->middleware(['signed', 'throttle:6,1'])
            ->name('verification.verify');
        Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
            ->middleware('throttle:6,1')
            ->name('verification.send');
        Route::post('/confirm-password', [ConfirmablePasswordController::class, 'store'])
            ->middleware('throttle:6,1')
            ->name('password.confirm');
    });
});

/*
|--------------------------------------------------------------------------
| Authenticated User Route
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
})->name('user.current');

/*
|--------------------------------------------------------------------------
| Settings Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->prefix('settings')->name('settings.')->group(function () {
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::put('/password', [PasswordController::class, 'update'])->name('password.update');
});

/*
|--------------------------------------------------------------------------
| API v1 Routes (Authentication Required)
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Public API v1 Routes (No Auth Required)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->name('api.v1.public.')->group(function () {
    Route::prefix('services')->name('services.')->group(function () {
        Route::get('/', [ServiceCatalogController::class, 'index'])->name('index');
        Route::get('/{id}', [ServiceCatalogController::class, 'show'])->name('show');
    });
});

Route::prefix('v1')->name('api.v1.')->middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::prefix('inventory')->name('inventory.')->group(function () {
        Route::get('/', [InventoryController::class, 'index'])->name('index');
        Route::post('/', [InventoryController::class, 'store'])->name('store');
        Route::get('/{id}', [InventoryController::class, 'show'])->name('show');
        Route::put('/{id}', [InventoryController::class, 'update'])->name('update');
        Route::delete('/{id}', [InventoryController::class, 'destroy'])->name('destroy');
        Route::get('/{itemId}/stock-status', [InventoryController::class, 'checkStockLevels'])->name('stock-status');
        Route::post('/add-stock', [InventoryController::class, 'addStock'])->name('add-stock');
        Route::post('/deduct-stock', [InventoryController::class, 'deductStock'])->name('deduct-stock');
        Route::post('/log-return-damage', [InventoryController::class, 'logReturnDamage'])->name('log-return-damage');
        Route::get('/alerts/low-stock', [InventoryController::class, 'generateLowStockAlerts'])->name('alerts.low-stock');
    });

    Route::prefix('reservations')->name('reservations.')->group(function () {
        Route::get('/', [ReservationController::class, 'index'])->name('index');
        Route::get('/summary', [ReservationController::class, 'getActiveReservationsSummary'])->name('summary');
        Route::get('/{id}', [ReservationController::class, 'show'])->name('show');
        Route::post('/reserve', [ReservationController::class, 'reservePartsForJob'])->name('reserve');
        Route::post('/reserve-multiple', [ReservationController::class, 'reserveMultiplePartsForJob'])->name('reserve-multiple');
        Route::post('/{id}/pay-fee', [ReservationController::class, 'initiateFeePay'])->name('pay-fee');
        Route::put('/{id}/approve', [ReservationController::class, 'approveReservation'])->name('approve');
        Route::put('/{id}/reject', [ReservationController::class, 'rejectReservation'])->name('reject');
        Route::put('/{id}/complete', [ReservationController::class, 'completeReservation'])->name('complete');
        Route::put('/{id}/cancel', [ReservationController::class, 'cancelReservation'])->name('cancel');
    });

    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [ReportController::class, 'getReports'])->name('index');
        Route::get('/{id}', [ReportController::class, 'show'])->name('show');
        Route::post('/daily-usage', [ReportController::class, 'generateDailyUsageReport'])->name('generate.daily');
        Route::post('/monthly-procurement', [ReportController::class, 'generateMonthlyProcurementReport'])->name('generate.monthly');
        Route::post('/reconciliation', [ReportController::class, 'generateReconciliationReport'])->name('generate.reconciliation');
        Route::get('/analytics/dashboard', [ReportController::class, 'getDashboardAnalytics'])->name('analytics.dashboard');
        Route::get('/analytics/usage', [ReportController::class, 'getUsageAnalytics'])->name('analytics.usage');
        Route::get('/analytics/procurement', [ReportController::class, 'getProcurementAnalytics'])->name('analytics.procurement');
    });

    Route::prefix('alerts')->name('alerts.')->group(function () {
        Route::get('/', [AlertController::class, 'index'])->name('index');
        Route::get('/statistics', [AlertController::class, 'getAlertStatistics'])->name('statistics');
        Route::post('/generate-low-stock', [AlertController::class, 'generateLowStockAlerts'])->name('generate.low-stock');
        Route::put('/{id}/acknowledge', [AlertController::class, 'acknowledge'])->name('acknowledge');
        Route::post('/bulk-acknowledge', [AlertController::class, 'bulkAcknowledge'])->name('bulk-acknowledge');
        Route::delete('/cleanup', [AlertController::class, 'cleanup'])->name('cleanup');
    });

    Route::prefix('transactions')->name('transactions.')->group(function () {
        Route::get('/', [TransactionController::class, 'index'])->name('index');
        Route::get('/{id}', [TransactionController::class, 'show'])->name('show');
    });

    Route::prefix('archives')->name('archives.')->group(function () {
        Route::get('/', [ArchiveController::class, 'index'])->name('index');
        Route::get('/{id}', [ArchiveController::class, 'show'])->name('show');
    });

    /*
    |--------------------------------------------------------------------------
    | Job Order & Service Management Routes
    |--------------------------------------------------------------------------
    */

    Route::prefix('job-orders')->name('job-orders.')->group(function () {
        Route::get('/', [JobOrderController::class, 'index'])->name('index');
        Route::post('/', [JobOrderController::class, 'store'])->name('store');
        Route::get('/{id}', [JobOrderController::class, 'show'])->name('show');
        Route::put('/{id}', [JobOrderController::class, 'update'])->name('update');
        Route::put('/{id}/approve', [JobOrderController::class, 'approve'])->name('approve');
        Route::put('/{id}/start', [JobOrderController::class, 'start'])->name('start');
        Route::put('/{id}/complete', [JobOrderController::class, 'complete'])->name('complete');
        Route::put('/{id}/settle', [JobOrderController::class, 'settle'])->name('settle');
        Route::delete('/{id}/cancel', [JobOrderController::class, 'cancel'])->name('cancel');
        Route::post('/{id}/items', [JobOrderController::class, 'addItem'])->name('items.store');
        Route::delete('/{id}/items/{itemId}', [JobOrderController::class, 'removeItem'])->name('items.destroy');
    });

    Route::prefix('customers')->name('customers.')->group(function () {
        Route::get('/me', [CustomerController::class, 'me'])->name('me');
        Route::get('/', [CustomerController::class, 'index'])->name('index');
        Route::post('/', [CustomerController::class, 'store'])->name('store');
        Route::get('/{id}', [CustomerController::class, 'show'])->name('show');
        Route::put('/{id}', [CustomerController::class, 'update'])->name('update');
        Route::put('/{id}/approve', [CustomerController::class, 'approve'])->name('approve');
        Route::put('/{id}/reject', [CustomerController::class, 'reject'])->name('reject');
        Route::put('/{id}/request-delete', [CustomerController::class, 'requestDelete'])->name('request-delete');
        Route::delete('/{id}', [CustomerController::class, 'destroy'])->name('destroy');
        Route::put('/{id}/personal-info', [CustomerController::class, 'updatePersonalInfo'])->name('personal-info');
        Route::put('/{id}/special-info', [CustomerController::class, 'updateSpecialInfo'])->name('special-info');
        Route::get('/{id}/audit-log', [CustomerController::class, 'auditLog'])->name('audit-log');
        Route::get('/{id}/transactions', [CustomerController::class, 'transactions'])->name('transactions');
        Route::post('/{id}/transactions', [CustomerController::class, 'linkTransaction'])->name('link-transaction');
        Route::get('/{id}/vehicles', [CustomerController::class, 'vehicles'])->name('vehicles');
        Route::post('/{id}/vehicles', [VehicleController::class, 'storeForCustomer'])->name('vehicles.store');
        Route::get('/{id}/job-orders', [CustomerController::class, 'jobOrders'])->name('job-orders');
    });

    Route::prefix('vehicles')->name('vehicles.')->group(function () {
        Route::get('/', [VehicleController::class, 'index'])->name('index');
        Route::post('/', [VehicleController::class, 'store'])->name('store');
        Route::put('/{id}', [VehicleController::class, 'update'])->name('update');
        Route::put('/{id}/approve', [VehicleController::class, 'approve'])->name('approve');
        Route::delete('/{id}', [VehicleController::class, 'destroy'])->name('destroy');
    });

    Route::get('/bays', [BayController::class, 'index'])->name('bays.index');
    Route::get('/mechanics', [MechanicController::class, 'index'])->name('mechanics.index');

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */

    Route::prefix('admin/frontdesk-accounts')->name('admin.frontdesk-accounts.')->group(function () {
        Route::get('/', [FrontDeskAccountController::class, 'index'])->name('index');
        Route::post('/', [FrontDeskAccountController::class, 'store'])->name('store');
        Route::delete('/{id}', [FrontDeskAccountController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('admin/booking-slots')->name('admin.booking-slots.')->group(function () {
        Route::get('/', [BookingSlotSettingsController::class, 'index'])->name('index');
        Route::put('/', [BookingSlotSettingsController::class, 'update'])->name('update');
    });

    /*
    |--------------------------------------------------------------------------
    | Payment Routes
    |--------------------------------------------------------------------------
    */

    Route::prefix('payments')->name('payments.')->group(function () {
        Route::post('/{transactionId}/invoice', [PaymentController::class, 'createInvoice'])->name('invoice.create');
    });

    /*
    |--------------------------------------------------------------------------
    | Shop Routes (customer-facing)
    |--------------------------------------------------------------------------
    */

    Route::prefix('shop')->name('shop.')->group(function () {
        Route::post('/checkout', [ShopController::class, 'checkout'])->name('checkout');
    });

    /*
    |--------------------------------------------------------------------------
    | Customer Self-Service Routes
    |--------------------------------------------------------------------------
    */

    Route::prefix('customer')->name('customer.')->group(function () {
        Route::get('/onboarding-status', [CustomerController::class, 'onboardingStatus'])->name('onboarding-status');
        Route::post('/onboarding', [CustomerController::class, 'completeOnboarding'])->name('onboarding.complete');
        Route::get('/availability', [CustomerBookingController::class, 'availability'])->name('availability');
        Route::get('/transactions', [CustomerController::class, 'myTransactions'])->name('transactions');
        Route::get('/job-orders', [CustomerController::class, 'myJobOrders'])->name('job-orders');
        Route::post('/book', [CustomerBookingController::class, 'store'])->name('book');
        Route::post('/book-with-payment', [CustomerBookingController::class, 'storeWithPayment'])->name('book-with-payment');
    });
});

/*
|--------------------------------------------------------------------------
| Xendit Webhook (public — validated by X-CALLBACK-TOKEN header)
|--------------------------------------------------------------------------
*/

Route::post('/v1/payments/webhook', [PaymentController::class, 'handleWebhook'])->name('api.v1.payments.webhook');
