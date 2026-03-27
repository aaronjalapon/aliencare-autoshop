<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\ReportServiceInterface;
use App\Exceptions\ReportGenerationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Report\GenerateDailyReportRequest;
use App\Http\Requests\Api\Report\GenerateMonthlyReportRequest;
use App\Http\Requests\Api\Report\GenerateReconciliationReportRequest;
use App\Http\Resources\ReportResource;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class ReportController extends Controller
{
    public function __construct(
        private ReportServiceInterface $reportService
    ) {}

    /**
     * Generate daily usage report.
     */
    public function generateDailyUsageReport(GenerateDailyReportRequest $request): JsonResponse
    {
        Gate::authorize('generate-reports');

        try {
            $date = Carbon::parse($request->input('date', now()->format('Y-m-d')));

            $report = $this->reportService->generateDailyUsageReport(
                $date,
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => new ReportResource($report),
                'message' => 'Daily usage report generated successfully',
            ]);
        } catch (ReportGenerationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate daily usage report: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate monthly procurement report.
     */
    public function generateMonthlyProcurementReport(GenerateMonthlyReportRequest $request): JsonResponse
    {
        Gate::authorize('generate-reports');

        try {
            $month = Carbon::parse($request->input('month', now()->format('Y-m')));

            $report = $this->reportService->generateMonthlyProcurementReport(
                $month->year,
                $month->month,
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => new ReportResource($report),
                'message' => 'Monthly procurement report generated successfully',
            ]);
        } catch (ReportGenerationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate monthly procurement report: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate reconciliation report.
     */
    public function generateReconciliationReport(GenerateReconciliationReportRequest $request): JsonResponse
    {
        Gate::authorize('generate-reports');

        try {
            $startDate = Carbon::parse($request->input('start_date'));
            $endDate = Carbon::parse($request->input('end_date'));

            $report = $this->reportService->generateReconciliationReport(
                $startDate,
                $endDate,
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => new ReportResource($report),
                'message' => 'Reconciliation report generated successfully',
            ]);
        } catch (ReportGenerationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate reconciliation report: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified report.
     */
    public function show(int $id): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $report = $this->reportService->getReport($id);

            return response()->json([
                'success' => true,
                'data' => new ReportResource($report),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }
    }

    /**
     * Get all reports with optional filtering.
     */
    public function getReports(Request $request): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $filters = [
                'report_type' => $request->input('report_type'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
            ];

            // Remove null values
            $filters = array_filter($filters, fn ($value) => $value !== null);

            $reports = $this->reportService->getReports(
                $filters,
                (int) $request->get('per_page', 15)
            );

            return response()->json([
                'success' => true,
                'data' => ReportResource::collection($reports)->response()->getData(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reports: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get dashboard analytics.
     */
    public function getDashboardAnalytics(): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $analytics = $this->reportService->getDashboardAnalytics();

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard analytics: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get usage analytics for a date range.
     */
    public function getUsageAnalytics(Request $request): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $startDate = Carbon::parse($request->input('start_date', now()->subDays(30)->format('Y-m-d')));
            $endDate = Carbon::parse($request->input('end_date', now()->format('Y-m-d')));

            $analytics = $this->reportService->getUsageAnalytics($startDate, $endDate);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch usage analytics: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get procurement analytics for a date range.
     */
    public function getProcurementAnalytics(Request $request): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $startDate = Carbon::parse($request->input('start_date', now()->subMonths(6)->format('Y-m-d')));
            $endDate = Carbon::parse($request->input('end_date', now()->format('Y-m-d')));

            $analytics = $this->reportService->getProcurementAnalytics($startDate, $endDate);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch procurement analytics: ' . $e->getMessage(),
            ], 500);
        }
    }
}
