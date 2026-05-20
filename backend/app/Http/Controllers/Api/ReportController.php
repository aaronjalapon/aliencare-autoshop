<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Services\ReportServiceInterface;
use App\Exceptions\ReportGenerationException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Report\GenerateDailyFinancialReportRequest;
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
     * Generate daily financial report.
     */
    public function generateDailyFinancialReport(GenerateDailyFinancialReportRequest $request): JsonResponse
    {
        Gate::authorize('generate-reports');

        try {
            $date = Carbon::parse($request->input('date', now()->format('Y-m-d')));

            $report = $this->reportService->generateDailyFinancialReport(
                $date,
                Auth::check() ? Auth::user()->name : 'System'
            );

            return response()->json([
                'success' => true,
                'data' => new ReportResource($report),
                'message' => 'Daily financial report generated successfully',
            ]);
        } catch (ReportGenerationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate daily financial report: '.$e->getMessage(),
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
    public function getDashboardAnalytics(GetAnalyticsDateRangeRequest $request): JsonResponse
    {
        Gate::authorize('view-reports');

        try {
            $validated = $request->validated();
            $startDate = isset($validated['start_date']) ? Carbon::parse($validated['start_date']) : null;
            $endDate = isset($validated['end_date']) ? Carbon::parse($validated['end_date']) : null;

            $analytics = $this->reportService->getDashboardAnalytics($startDate, $endDate);

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
        $data = $report->data_summary ?? [];
        $filename = sprintf('%s-%s.pdf', $report->report_type, $report->report_date);
        $brand = config('reporting.brand');
        $formatting = config('reporting.formatting');

        $logoPath = public_path($brand['logo_path'] ?? 'images/WORD LOGO.jpg');

        $logoDataUri = null;
        if (is_file($logoPath)) {
            $logoData = base64_encode((string) file_get_contents($logoPath));
            $logoDataUri = 'data:image/jpeg;base64,'.$logoData;
        }

        $escape = function ($value): string {
            if ($value instanceof \DateTimeInterface) {
                $value = $value->format('Y-m-d H:i');
            }

            return htmlspecialchars((string) $value);
        };
        $labelize = function (string $value): string {
            return ucwords(str_replace('_', ' ', $value));
        };
        $formatDate = function ($value) use ($formatting): string {
            if ($value instanceof \DateTimeInterface) {
                return $value->format($formatting['date_format'] ?? 'Y-m-d');
            }

            return (string) $value;
        };
        $formatCurrency = function ($value) use ($formatting): string {
            $currency = $formatting['currency'] ?? 'PHP';
            $amount = is_numeric($value) ? (float) $value : 0.0;

            return $currency.' '.number_format($amount, 2);
        };
        $formatNumber = function ($value, int $decimals = 0): string {
            $amount = is_numeric($value) ? (float) $value : 0.0;

            return number_format($amount, $decimals);
        };

        if (! class_exists(\Dompdf\Dompdf::class)) {
            throw new \RuntimeException('PDF export requires Dompdf. Run: composer require barryvdh/laravel-dompdf');
        }

        $html = (function () use ($data, $report, $brand, $formatting, $logoDataUri, $escape, $labelize, $formatDate, $formatCurrency, $formatNumber): string {
            $title = $labelize((string) $report->report_type).' Report';
            $companyName = $brand['company_name'] ?? config('app.name', 'Alien Care Auto Shop');
            $addressLine1 = $brand['address_line_1'] ?? '';
            $addressLine2 = $brand['address_line_2'] ?? '';
            $contactPhone = $brand['contact_phone'] ?? '';
            $contactEmail = $brand['contact_email'] ?? '';
            $website = $brand['website'] ?? '';
            $taxId = $brand['tax_id'] ?? '';

            $renderTable = function (array $headers, array $rows) use ($escape): string {
                $html = '<table><thead><tr>';
                foreach ($headers as $header) {
                    $html .= '<th>'.$escape($header).'</th>';
                }
                $html .= '</tr></thead><tbody>';
                foreach ($rows as $row) {
                    $html .= '<tr>';
                    foreach ($row as $cell) {
                        $html .= '<td>'.$escape($cell).'</td>';
                    }
                    $html .= '</tr>';
                }
                $html .= '</tbody></table>';

                return $html;
            };

            $renderKpis = function (array $items) use ($renderTable): string {
                $headers = ['Metric', 'Value'];
                $rows = [];
                foreach ($items as $label => $value) {
                    $rows[] = [$label, $value];
                }

                return '<div class="summary">'.$renderTable($headers, $rows).'</div>';
            };

            $sections = [];

            switch ((string) $report->report_type) {
                case 'daily_usage':
                    $kpis = [
                        'Date' => $formatDate($data['date'] ?? $report->report_date),
                        'Total Transactions' => $formatNumber($data['total_transactions'] ?? 0),
                        'Top Items Count' => $formatNumber(count($data['top_items'] ?? [])),
                    ];
                    $sections[] = ['Executive Summary', $renderKpis($kpis)];

                    $byTypeRows = [];
                    foreach (($data['by_type'] ?? []) as $type => $values) {
                        $byTypeRows[] = [
                            $labelize((string) $type),
                            $formatNumber($values['count'] ?? 0),
                            $formatNumber($values['total_quantity'] ?? 0),
                        ];
                    }
                    if ($byTypeRows) {
                        $sections[] = ['Transactions by Type', $renderTable(['Type', 'Count', 'Total Quantity'], $byTypeRows)];
                    }

                    $topItemRows = [];
                    foreach (($data['top_items'] ?? []) as $item) {
                        $topItemRows[] = [
                            $item['item_name'] ?? 'Unknown',
                            $formatNumber($item['transaction_count'] ?? 0),
                            $formatNumber($item['total_quantity'] ?? 0),
                        ];
                    }
                    if ($topItemRows) {
                        $sections[] = ['Top Moving Items', $renderTable(['Item', 'Transactions', 'Total Quantity'], $topItemRows)];
                    }
                    break;
                case 'monthly_procurement':
                    $period = $data['period'] ?? [];
                    $kpis = [
                        'Period' => ($period['month_name'] ?? '').' '.($period['year'] ?? ''),
                        'Total Procurements' => $formatNumber($data['total_procurements'] ?? 0),
                        'Total Quantity' => $formatNumber($data['total_quantity'] ?? 0),
                        'Total Value' => $formatCurrency($data['total_value'] ?? 0),
                    ];
                    $sections[] = ['Executive Summary', $renderKpis($kpis)];

                    $categoryRows = [];
                    foreach (($data['by_category'] ?? []) as $category => $values) {
                        $categoryRows[] = [
                            $category,
                            $formatNumber($values['count'] ?? 0),
                            $formatNumber($values['quantity'] ?? 0),
                            $formatCurrency($values['value'] ?? 0),
                        ];
                    }
                    if ($categoryRows) {
                        $sections[] = ['Procurement by Category', $renderTable(['Category', 'Count', 'Quantity', 'Value'], $categoryRows)];
                    }

                    $supplierRows = [];
                    foreach (($data['by_supplier'] ?? []) as $supplier => $values) {
                        $supplierRows[] = [
                            $supplier,
                            $formatNumber($values['count'] ?? 0),
                            $formatNumber($values['quantity'] ?? 0),
                        ];
                    }
                    if ($supplierRows) {
                        $sections[] = ['Procurement by Supplier', $renderTable(['Supplier', 'Count', 'Quantity'], $supplierRows)];
                    }

                    $dailyRows = [];
                    foreach (($data['daily_breakdown'] ?? []) as $date => $values) {
                        $dailyRows[] = [
                            $date,
                            $formatNumber($values['count'] ?? 0),
                            $formatNumber($values['quantity'] ?? 0),
                        ];
                    }
                    if ($dailyRows) {
                        $sections[] = ['Daily Breakdown', $renderTable(['Date', 'Count', 'Quantity'], $dailyRows)];
                    }
                    break;
                case 'reconciliation':
                    $period = $data['period'] ?? [];
                    $kpis = [
                        'Period' => ($period['start_date'] ?? '').' to '.($period['end_date'] ?? ''),
                        'Items Checked' => $formatNumber($data['total_items_checked'] ?? 0),
                        'Items with Discrepancy' => $formatNumber($data['items_with_discrepancy'] ?? 0),
                        'Accuracy Rate' => $formatNumber($data['accuracy_rate'] ?? 0, 2).'%',
                        'Total Discrepancy Value' => $formatCurrency($data['total_discrepancy_value'] ?? 0),
                    ];
                    $sections[] = ['Executive Summary', $renderKpis($kpis)];

                    $discrepancyRows = [];
                    foreach (($data['discrepancies'] ?? []) as $item) {
                        $discrepancyRows[] = [
                            $item['item_name'] ?? 'Unknown',
                            $formatNumber($item['current_stock'] ?? 0),
                            $formatNumber($item['expected_stock'] ?? 0),
                            $formatNumber($item['discrepancy'] ?? 0),
                            $formatNumber($item['transaction_count'] ?? 0),
                        ];
                    }
                    if ($discrepancyRows) {
                        $sections[] = ['Discrepancies (Top 20)', $renderTable(['Item', 'Current', 'Expected', 'Discrepancy', 'Transactions'], $discrepancyRows)];
                    }
                    break;
                case 'daily_financial':
                    $kpis = [
                        'Date' => $formatDate($data['date'] ?? $report->report_date),
                        'Total Revenue' => $formatCurrency($data['total_revenue'] ?? 0),
                        'Pending Amount' => $formatCurrency($data['pending_amount'] ?? 0),
                        'Total Transactions' => $formatNumber($data['total_transactions'] ?? 0),
                    ];
                    $sections[] = ['Executive Summary', $renderKpis($kpis)];

                    $methodRows = [];
                    foreach (($data['by_payment_method'] ?? []) as $method => $values) {
                        $methodRows[] = [
                            $labelize((string) $method),
                            $formatNumber($values['count'] ?? 0),
                            $formatCurrency($values['total'] ?? 0),
                        ];
                    }
                    if ($methodRows) {
                        $sections[] = ['Revenue by Payment Method', $renderTable(['Method', 'Count', 'Total'], $methodRows)];
                    }

                    $typeRows = [];
                    foreach (($data['by_type'] ?? []) as $type => $values) {
                        $typeRows[] = [
                            $labelize((string) $type),
                            $formatNumber($values['count'] ?? 0),
                            $formatCurrency($values['total'] ?? 0),
                        ];
                    }
                    if ($typeRows) {
                        $sections[] = ['Revenue by Transaction Type', $renderTable(['Type', 'Count', 'Total'], $typeRows)];
                    }
                    break;
                case 'low_stock_alert':
                    $kpis = [
                        'Check Date' => $formatDate($data['check_date'] ?? $report->report_date),
                        'Low Stock Items' => $formatNumber($data['total_low_stock_items'] ?? 0),
                        'Critical Items' => $formatNumber($data['critical_items'] ?? 0),
                        'Estimated Reorder Cost' => $formatCurrency($data['total_estimated_reorder_cost'] ?? 0),
                    ];
                    $sections[] = ['Executive Summary', $renderKpis($kpis)];

                    $itemRows = [];
                    foreach (($data['items'] ?? []) as $item) {
                        $itemRows[] = [
                            $item['item_name'] ?? 'Unknown',
                            $formatNumber($item['current_stock'] ?? 0),
                            $formatNumber($item['reorder_level'] ?? 0),
                            $labelize((string) ($item['urgency'] ?? 'normal')),
                            $item['supplier'] ?? 'Unknown',
                            $formatCurrency($item['estimated_reorder_cost'] ?? 0),
                        ];
                    }
                    if ($itemRows) {
                        $sections[] = ['Low Stock Items', $renderTable(['Item', 'Current', 'Reorder Level', 'Urgency', 'Supplier', 'Est. Cost'], $itemRows)];
                    }
                    break;
                default:
                    $sections[] = ['Report Details', '<p>No formatted template available for this report type.</p>'];
            }

            ob_start();

            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report</title>';
            echo '<style>';
            echo '@page{margin:28px 32px}';
            echo 'body{font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.45}';
            echo '.header{border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:16px;display:flex;align-items:center;gap:16px}';
            echo '.brand{display:flex;align-items:center;gap:12px}';
            echo '.brand img{height:48px}';
            echo '.header h1{margin:0;font-size:24px;letter-spacing:0.5px}';
            echo '.subhead{font-size:12px;color:#6b7280;margin-top:4px}';
            echo '.meta{display:flex;flex-wrap:wrap;gap:10px 24px;font-size:12px;color:#374151;margin-top:10px}';
            echo '.pill{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:4px 10px;font-size:11px}';
            echo '.section{margin:20px 0}';
            echo '.section h2{font-size:15px;margin:0 0 8px;border-left:4px solid #111827;padding-left:8px}';
            echo '.summary{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}';
            echo 'table{border-collapse:collapse;width:100%;margin-top:8px}';
            echo 'td,th{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;font-size:12px}';
            echo 'th{background:#f3f4f6;font-weight:600}';
            echo '.footer{margin-top:28px;font-size:11px;color:#6b7280;display:flex;justify-content:space-between}';
            echo '</style></head><body>';

            echo '<div class="header">';
            echo '<div class="brand">';
            if ($logoDataUri) {
                echo '<img src="'.$escape($logoDataUri).'" alt="'. $escape($companyName) .'" />';
            }
            echo '<div>'; 
            echo '<div class="pill">'.$escape($companyName).'</div>';
            echo '<h1>'.$escape($title).'</h1>';
            echo '<div class="subhead">'.$escape($addressLine1).' '.$escape($addressLine2).'</div>';
            echo '</div>';
            echo '</div>';
            echo '</div>';

            echo '<div class="meta">';
            echo '<div><strong>Report Date:</strong> '.$escape($formatDate($report->report_date ?? '')).'</div>';
            echo '<div><strong>Generated:</strong> '.$escape($report->generated_date?->format($formatting['datetime_format'] ?? 'Y-m-d H:i') ?? '').'</div>';
            echo '<div><strong>Generated By:</strong> '.$escape($report->generated_by ?? 'System').'</div>';
            echo '<div><strong>Report ID:</strong> '.$escape($report->id).'</div>';
            if ($taxId) {
                echo '<div><strong>TIN:</strong> '.$escape($taxId).'</div>';
            }
            echo '</div>';

            foreach ($sections as [$sectionTitle, $sectionHtml]) {
                echo '<div class="section">';
                echo '<h2>'.$escape($sectionTitle).'</h2>';
                echo $sectionHtml;
                echo '</div>';
            }

            echo '<div class="footer">';
            echo '<span>'.$escape($contactPhone).' | '.$escape($contactEmail).' | '.$escape($website).'</span>';
            echo '<span>Confidential - For internal use only</span>';
            echo '</div>';
            echo '</body></html>';

            return (string) ob_get_clean();
        })();

        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new \Dompdf\Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return response()->streamDownload(function () use ($dompdf) {
            echo $dompdf->output();
        }, $filename, ['Content-Type' => 'application/pdf']);
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
