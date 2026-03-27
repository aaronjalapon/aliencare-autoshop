<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\ArchiveController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\TransactionController;
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
});
