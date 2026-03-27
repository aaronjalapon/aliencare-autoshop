<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Health check controller for API monitoring and status verification.
 */
class HealthController extends Controller
{
    /**
     * Check the health status of the API and its dependencies.
     *
     * Returns a comprehensive health check including database connectivity,
     * current timestamp, and API version information.
     */
    public function index(): JsonResponse
    {
        $databaseStatus = $this->checkDatabaseConnection();

        return response()->json([
            'success' => true,
            'status' => $databaseStatus ? 'healthy' : 'degraded',
            'database' => $databaseStatus ? 'connected' : 'disconnected',
            'timestamp' => now()->toISOString(),
            'version' => config('app.version', '1.0.0'),
        ], $databaseStatus ? 200 : 503);
    }

    /**
     * Check database connectivity.
     */
    private function checkDatabaseConnection(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
