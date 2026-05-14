<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\ReportServiceInterface;
use App\Exceptions\ReportGenerationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Report\GenerateDailyReportRequest;
use App\Http\Requests\Api\Report\GenerateMonthlyReportRequest;
use App\Http\Requests\Api\Report\GenerateReconciliationReportRequest;
use App\Http\Requests\Api\Report\GetAnalyticsDateRangeRequest;
use App\Http\Resources\ReportResource;
use App\Models\Report;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
                'message' => 'Failed to generate daily usage report: '.$e->getMessage(),
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
            $year = (int) $request->input('year');
            $month = (int) $request->input('month');

            $report = $this->reportService->generateMonthlyProcurementReport(
                $year,
                $month,
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
                'message' => 'Failed to generate monthly procurement report: '.$e->getMessage(),
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
                'message' => 'Failed to generate reconciliation report: '.$e->getMessage(),
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
                'message' => 'Failed to fetch reports: '.$e->getMessage(),
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
                'message' => 'Failed to fetch dashboard analytics: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get usage analytics for a date range.
     */
    public function getUsageAnalytics(GetAnalyticsDateRangeRequest $request): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $validated = $request->validated();
            $startDate = Carbon::parse($validated['start_date'] ?? now()->subDays(30)->format('Y-m-d'));
            $endDate = Carbon::parse($validated['end_date'] ?? now()->format('Y-m-d'));

            $analytics = $this->reportService->getUsageAnalytics($startDate, $endDate);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch usage analytics: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export a report as CSV or PDF.
     */
    public function exportReport(int $id): JsonResponse|StreamedResponse
    {
        Gate::authorize('view-reports');

        try {
            $report = $this->reportService->getReport($id);
            $format = request()->get('format', 'csv');

            if ($format === 'pdf') {
                return $this->streamPdfReport($report);
            }

            return $this->streamCsvReport($report);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to export report: '.$e->getMessage(),
            ], 500);
        }
    }

    private function streamCsvReport(Report $report): StreamedResponse
    {
        $data = $report->data_summary ?? [];
        $filename = sprintf('%s-%s.csv', $report->report_type, $report->report_date);

        return response()->streamDownload(function () use ($data, $report) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Report Type', $report->report_type]);
            fputcsv($handle, ['Report Date', $report->report_date]);
            fputcsv($handle, ['Generated', $report->generated_date?->toDateTimeString() ?? '']);
            fputcsv($handle, []);

            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    fputcsv($handle, [ucwords(str_replace('_', ' ', $key))]);
                    foreach ($value as $subKey => $subValue) {
                        $row = is_array($subValue) ? $subValue : [$subKey => $subValue];
                        fputcsv($handle, array_merge(array_keys($row), array_values($row)));
                    }
                    fputcsv($handle, []);
                } else {
                    fputcsv($handle, [ucwords(str_replace('_', ' ', $key)), $value]);
                }
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function streamPdfReport(Report $report): StreamedResponse
    {
        // Simple HTML-to-PDF via browser print; we stream an HTML page.
        $data = $report->data_summary ?? [];
        $filename = sprintf('%s-%s.html', $report->report_type, $report->report_date);

        return response()->streamDownload(function () use ($data, $report) {
            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report</title>';
            echo '<style>body{font-family:sans-serif;padding:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body>';
            echo '<h1>'.htmlspecialchars(ucwords(str_replace('_', ' ', $report->report_type))).'</h1>';
            echo '<p>Date: '.htmlspecialchars($report->report_date).'</p>';
            echo '<p>Generated: '.htmlspecialchars($report->generated_date?->toDateTimeString() ?? '').'</p>';

            foreach ($data as $key => $value) {
                echo '<h3>'.htmlspecialchars(ucwords(str_replace('_', ' ', (string) $key))).'</h3>';
                if (is_array($value)) {
                    echo '<table><thead><tr>';
                    $headers = [];
                    foreach ($value as $item) {
                        if (is_array($item)) {
                            $headers = array_keys($item);
                            break;
                        }
                    }
                    foreach ($headers as $h) {
                        echo '<th>'.htmlspecialchars(ucwords(str_replace('_', ' ', $h))).'</th>';
                    }
                    echo '</tr></thead><tbody>';
                    foreach ($value as $item) {
                        echo '<tr>';
                        foreach ($headers as $h) {
                            echo '<td>'.htmlspecialchars((string) ($item[$h] ?? '')).'</td>';
                        }
                        echo '</tr>';
                    }
                    echo '</tbody></table>';
                } else {
                    echo '<p>'.htmlspecialchars((string) $value).'</p>';
                }
            }

            echo '</body></html>';
        }, $filename, ['Content-Type' => 'text/html']);
    }

    /**
     * Get procurement analytics for a date range.
     */
    public function getProcurementAnalytics(GetAnalyticsDateRangeRequest $request): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $validated = $request->validated();
            $startDate = Carbon::parse($validated['start_date'] ?? now()->subMonths(6)->format('Y-m-d'));
            $endDate = Carbon::parse($validated['end_date'] ?? now()->format('Y-m-d'));

            $analytics = $this->reportService->getProcurementAnalytics($startDate, $endDate);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch procurement analytics: '.$e->getMessage(),
            ], 500);
        }
    }
}
