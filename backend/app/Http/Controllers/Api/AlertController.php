<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\AlertServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Alert\BulkAcknowledgeRequest;
use App\Http\Resources\AlertResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AlertController extends Controller
{
    public function __construct(
        private AlertServiceInterface $alertService
    ) {}

    /**
     * Get all alerts with pagination and filtering.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'acknowledged' => $request->has('acknowledged')
                    ? filter_var($request->acknowledged, FILTER_VALIDATE_BOOLEAN)
                    : null,
                'urgency' => $request->input('urgency'),
                'alert_type' => $request->input('alert_type'),
            ];

            // Remove null values
            $filters = array_filter($filters, fn ($value) => $value !== null);

            $alerts = $this->alertService->getAlerts(
                $filters,
                (int) $request->get('per_page', 15)
            );

            return response()->json([
                'success' => true,
                'data' => AlertResource::collection($alerts)->response()->getData(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch alerts: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate low stock alerts based on current inventory levels.
     */
    public function generateLowStockAlerts(): JsonResponse
    {
        try {
            $result = $this->alertService->generateLowStockAlerts();

            return response()->json([
                'success' => true,
                'data' => [
                    'alerts_created' => $result['created'],
                    'alerts_updated' => $result['updated'],
                    'total_alerts' => $result['alerts']->count(),
                ],
                'message' => "Generated {$result['created']} new alerts, updated {$result['updated']} existing alerts",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate alerts: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get alert statistics.
     */
    public function getAlertStatistics(): JsonResponse
    {
        try {
            $statistics = $this->alertService->getAlertStatistics();

            return response()->json([
                'success' => true,
                'data' => $statistics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch alert statistics: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Acknowledge a single alert.
     */
    public function acknowledge(Request $request, int $id): JsonResponse
    {
        try {
            $alert = $this->alertService->acknowledgeAlert(
                $id,
                Auth::check() ? Auth::user()->name : 'System',
                $request->input('notes')
            );

            return response()->json([
                'success' => true,
                'data' => new AlertResource($alert),
                'message' => 'Alert acknowledged successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to acknowledge alert: '.$e->getMessage(),
            ], 404);
        }
    }

    /**
     * Bulk acknowledge multiple alerts.
     */
    public function bulkAcknowledge(BulkAcknowledgeRequest $request): JsonResponse
    {
        try {
            $result = $this->alertService->bulkAcknowledgeAlerts(
                $request->input('alert_ids'),
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'acknowledged_count' => $result['acknowledged_count'],
                    'failed_count' => $result['failed_count'],
                ],
                'message' => "Successfully acknowledged {$result['acknowledged_count']} alert(s)",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to bulk acknowledge alerts: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cleanup old acknowledged alerts.
     */
    public function cleanup(Request $request): JsonResponse
    {
        try {
            $daysOld = (int) $request->get('days_old', 30);

            $result = $this->alertService->cleanupAlerts($daysOld);

            return response()->json([
                'success' => true,
                'data' => [
                    'deleted_count' => $result['deleted_count'],
                ],
                'message' => $result['message'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cleanup alerts: '.$e->getMessage(),
            ], 500);
        }
    }
}
