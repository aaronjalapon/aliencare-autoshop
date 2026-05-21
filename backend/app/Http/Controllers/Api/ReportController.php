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
     * Export a report as CSV, HTML, or PDF.
     */
    public function exportReport(int $id): JsonResponse|StreamedResponse
    {
        Gate::authorize('view-reports');

        $format = (string) request()->get('format', 'csv');

        try {
            $report = $this->reportService->getReport($id);

            if ($format === 'html') {
                return $this->streamHtmlReport($report);
            }

            if ($format === 'pdf') {
                return $this->streamPdfReport($report);
            }

            return $this->streamCsvReport($report);
        } catch (\Exception $e) {
            logger()->error('Report export failed', [
                'report_id' => $id,
                'format' => $format,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to export report: '.$e->getMessage(),
            ], 500);
        }
    }

    private function normalizeReportDataSummary(mixed $data): array
    {
        if (is_array($data)) {
            return $data;
        }

        if (is_string($data)) {
            $decoded = json_decode($data, true);
            return is_array($decoded) ? $decoded : [];
        }

        if (is_object($data)) {
            if (method_exists($data, 'toArray')) {
                $array = $data->toArray();
                return is_array($array) ? $array : [];
            }

            return (array) $data;
        }

        return [];
    }

    private function streamCsvReport(Report $report): StreamedResponse
    {
        $data = $this->normalizeReportDataSummary($report->data_summary);
        $filename = sprintf('%s-%s.csv', $report->report_type, $report->report_date);

        return response()->streamDownload(function () use ($data, $report) {
            $formatCsvValue = function ($value): string {
                if ($value instanceof \DateTimeInterface) {
                    return $value->format('Y-m-d H:i');
                }

                if (is_bool($value)) {
                    return $value ? 'Yes' : 'No';
                }

                if (is_array($value) || is_object($value)) {
                    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    return $encoded === false ? '' : $encoded;
                }

                return (string) $value;
            };

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
                        $cells = array_merge(array_keys($row), array_values($row));
                        fputcsv($handle, array_map($formatCsvValue, $cells));
                    }
                    fputcsv($handle, []);
                } else {
                    fputcsv($handle, [ucwords(str_replace('_', ' ', $key)), $formatCsvValue($value)]);
                }
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function streamHtmlReport(Report $report): StreamedResponse
    {
        $filename = sprintf('%s-%s.html', $report->report_type, $report->report_date);
        $html = $this->buildReportHtml($report);

        return response()->streamDownload(function () use ($html) {
            echo $html;
        }, $filename, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    private function buildReportHtml(Report $report): string
    {
        $data = $this->normalizeReportDataSummary($report->data_summary);
        $brand = config('reporting.brand');
        $formatting = config('reporting.formatting');

        $logoPath = public_path($brand['logo_path'] ?? 'images/WORD LOGO.jpg');

        $logoDataUri = null;
        if (is_file($logoPath)) {
            $logoData = base64_encode((string) file_get_contents($logoPath));
            $extension = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION));
            $mimeMap = [
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'svg' => 'image/svg+xml',
            ];
            $logoMime = $mimeMap[$extension] ?? 'image/png';
            $logoDataUri = 'data:'.$logoMime.';base64,'.$logoData;
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

        return (function () use ($data, $report, $brand, $formatting, $logoDataUri, $escape, $labelize, $formatDate, $formatCurrency, $formatNumber): string {
            $typeLabel = $labelize((string) $report->report_type);
            $title = $typeLabel.' Report';
            $companyName = $brand['company_name'] ?? config('app.name', 'Alien Care Auto Shop');
            $addressLine1 = $brand['address_line_1'] ?? '';
            $addressLine2 = $brand['address_line_2'] ?? '';
            $contactPhone = $brand['contact_phone'] ?? '';
            $contactEmail = $brand['contact_email'] ?? '';
            $website = $brand['website'] ?? '';
            $taxId = $brand['tax_id'] ?? '';
            $addressLine = trim($addressLine1.' '.$addressLine2);
            $footerParts = array_filter([
                $companyName,
                $contactPhone,
                $contactEmail,
                $website,
            ], static fn ($value) => $value !== '');
            $footerLeft = implode(' | ', $footerParts);

            $formatCell = function ($cell) use ($escape): string {
                if ($cell instanceof \DateTimeInterface) {
                    return $escape($cell);
                }

                if (is_bool($cell)) {
                    return $escape($cell ? 'Yes' : 'No');
                }

                if (is_array($cell)) {
                    $parts = [];
                    foreach ($cell as $key => $value) {
                        if ($value instanceof \DateTimeInterface) {
                            $value = $value->format('Y-m-d H:i');
                        } elseif (is_array($value)) {
                            $value = json_encode($value);
                        }

                        $parts[] = is_string($key) ? $key.': '.$value : $value;
                    }

                    return $escape(implode(' | ', $parts));
                }

                if ($cell === null) {
                    return '';
                }

                return $escape($cell);
            };

            $renderTable = function (array $headers, array $rows) use ($escape, $formatCell): string {
                $html = '<table class="data-table"><thead><tr>';
                foreach ($headers as $header) {
                    $html .= '<th>'.$escape($header).'</th>';
                }
                $html .= '</tr></thead><tbody>';
                foreach ($rows as $row) {
                    $html .= '<tr>';
                    foreach ($row as $cell) {
                        $html .= '<td>'.$formatCell($cell).'</td>';
                    }
                    $html .= '</tr>';
                }
                $html .= '</tbody></table>';

                return $html;
            };

            $renderKpis = function (array $items) use ($escape): string {
                $cells = [];
                foreach ($items as $label => $value) {
                    $cells[] = ['label' => $label, 'value' => $value];
                }

                $columns = 2;
                $html = '<table class="kpi-grid"><tbody>';
                $total = count($cells);

                for ($i = 0; $i < $total; $i += $columns) {
                    $html .= '<tr>';
                    for ($j = 0; $j < $columns; $j++) {
                        $index = $i + $j;
                        if (! isset($cells[$index])) {
                            $html .= '<td></td>';
                            continue;
                        }
                        $cell = $cells[$index];
                        $html .= '<td><div class="kpi-label">'.$escape($cell['label']).'</div>';
                        $html .= '<div class="kpi-value">'.$escape($cell['value']).'</div></td>';
                    }
                    $html .= '</tr>';
                }

                $html .= '</tbody></table>';

                return $html;
            };

            $sections = [];

            switch ((string) $report->report_type) {
                case 'daily_usage':
                    $summary = is_array($data['summary'] ?? null) ? $data['summary'] : [];
                    $topItems = $data['top_items'] ?? $data['top_consumed_items'] ?? $data['usage_by_item'] ?? [];
                    $topItemCount = is_array($topItems) ? count($topItems) : 0;
                    $kpis = [
                        'Report Date' => $formatDate($data['date'] ?? $report->report_date),
                        'Total Transactions' => $formatNumber($summary['total_transactions'] ?? $data['total_transactions'] ?? 0),
                        'Total Consumed' => $formatNumber($summary['total_consumed'] ?? $data['total_consumed'] ?? 0),
                        'Top Items' => $formatNumber($topItemCount),
                    ];
                    $sections[] = ['Executive Summary', $renderKpis($kpis)];

                    $byTypeRows = [];
                    $byTypeSource = $data['by_type'] ?? $data['summary_by_type'] ?? [];
                    foreach ($byTypeSource as $type => $values) {
                        $count = 0;
                        $totalQuantity = 0;

                        if (is_array($values)) {
                            if (array_key_exists('count', $values)) {
                                $count = (int) ($values['count'] ?? 0);
                                $totalQuantity = (float) ($values['total_quantity'] ?? $values['quantity'] ?? 0);
                            } else {
                                $count = count($values);
                                foreach ($values as $entry) {
                                    if (! is_array($entry)) {
                                        continue;
                                    }
                                    $totalQuantity += (float) ($entry['total_quantity'] ?? $entry['quantity'] ?? 0);
                                }
                            }
                        }

                        $byTypeRows[] = [
                            $labelize((string) $type),
                            $formatNumber($count),
                            $formatNumber($totalQuantity),
                        ];
                    }
                    if ($byTypeRows) {
                        $sections[] = ['Transactions by Type', $renderTable(['Type', 'Count', 'Total Quantity'], $byTypeRows)];
                    }

                    $topItemRows = [];
                    $topItemHeaders = ['Item', 'Transactions', 'Total Quantity'];
                    if (is_array($topItems)) {
                        foreach ($topItems as $item) {
                            if (! is_array($item)) {
                                continue;
                            }
                            if (array_key_exists('consumed', $item)) {
                                $topItemHeaders = ['Item', 'Part Number', 'Consumed', 'Cost'];
                                $topItemRows[] = [
                                    $item['item_name'] ?? 'Unknown',
                                    $item['part_number'] ?? 'N/A',
                                    $formatNumber($item['consumed'] ?? 0),
                                    $formatCurrency($item['cost'] ?? 0),
                                ];
                            } else {
                                $topItemRows[] = [
                                    $item['item_name'] ?? 'Unknown',
                                    $formatNumber($item['transaction_count'] ?? 0),
                                    $formatNumber($item['total_quantity'] ?? $item['quantity'] ?? 0),
                                ];
                            }
                        }
                    }
                    if ($topItemRows) {
                        $sections[] = ['Top Moving Items', $renderTable($topItemHeaders, $topItemRows)];
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
                        if (is_array($values) && array_key_exists('category', $values)) {
                            $categoryLabel = (string) ($values['category'] ?? 'Unknown');
                            $values = $values;
                        } else {
                            $categoryLabel = (string) $category;
                        }
                        $categoryRows[] = [
                            $categoryLabel,
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
                        if (is_array($values) && array_key_exists('supplier', $values)) {
                            $supplierLabel = (string) ($values['supplier'] ?? 'Unknown');
                            $values = $values;
                        } else {
                            $supplierLabel = (string) $supplier;
                        }
                        $supplierRows[] = [
                            $supplierLabel,
                            $formatNumber($values['count'] ?? 0),
                            $formatNumber($values['quantity'] ?? 0),
                        ];
                    }
                    if ($supplierRows) {
                        $sections[] = ['Procurement by Supplier', $renderTable(['Supplier', 'Count', 'Quantity'], $supplierRows)];
                    }

                    $dailyRows = [];
                    $dailyHeaders = ['Date', 'Count', 'Quantity'];
                    if (isset($data['monthly_breakdown'])) {
                        $dailyHeaders = ['Month', 'Quantity', 'Value'];
                        $dailySource = $data['monthly_breakdown'] ?? [];
                    } else {
                        $dailySource = $data['daily_breakdown'] ?? [];
                    }

                    foreach ($dailySource as $date => $values) {
                        if (is_array($values) && array_key_exists('month', $values)) {
                            $dateLabel = (string) ($values['month'] ?? '');
                        } else {
                            $dateLabel = (string) $date;
                        }

                        if ($dailyHeaders[0] === 'Month') {
                            $dailyRows[] = [
                                $dateLabel,
                                $formatNumber($values['quantity'] ?? 0),
                                $formatCurrency($values['value'] ?? 0),
                            ];
                        } else {
                            $dailyRows[] = [
                                $dateLabel,
                                $formatNumber($values['count'] ?? 0),
                                $formatNumber($values['quantity'] ?? 0),
                            ];
                        }
                    }
                    if ($dailyRows) {
                        $sections[] = ['Daily Breakdown', $renderTable($dailyHeaders, $dailyRows)];
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
                case 'low_stock':
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

            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'.$escape($title).'</title>';
            echo '<style>';
            echo '@page{margin:26px 32px}';
            echo ':root{--brand-gold:#d4af37;--brand-ink:#0a0b0f;--brand-muted:#6b7280;--brand-line:#e5e7eb;--brand-soft:#f9fafb}';
            echo 'body{font-family:DejaVu Sans,Arial,Helvetica,sans-serif;color:#111827;line-height:1.4;font-size:12px}';
            echo '.header{border-bottom:2px solid var(--brand-ink);padding-bottom:12px;margin-bottom:14px}';
            echo '.header-table{width:100%;border-collapse:collapse}';
            echo '.logo-cell{width:90px;vertical-align:top}';
            echo '.logo-cell img{width:78px;height:auto}';
            echo '.company{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--brand-gold);font-weight:700}';
            echo '.report-title{font-size:22px;font-weight:700;color:var(--brand-ink);margin-top:4px}';
            echo '.address{font-size:11px;color:var(--brand-muted);margin-top:2px}';
            echo '.meta{margin-top:10px}';
            echo '.meta-table{width:100%;border-collapse:collapse}';
            echo '.meta-table td{font-size:11px;color:#374151;padding:3px 6px;vertical-align:top}';
            echo '.meta-label{color:var(--brand-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;font-size:9px;margin-bottom:2px}';
            echo '.section{margin:18px 0}';
            echo '.section h2{font-size:12px;margin:0 0 8px;border-left:4px solid var(--brand-gold);padding-left:8px;text-transform:uppercase;letter-spacing:1px;color:var(--brand-ink)}';
            echo '.kpi-grid{width:100%;border-collapse:collapse}';
            echo '.kpi-grid td{border:1px solid var(--brand-line);background:var(--brand-soft);padding:8px;vertical-align:top}';
            echo '.kpi-label{font-size:9px;color:var(--brand-muted);text-transform:uppercase;letter-spacing:0.8px}';
            echo '.kpi-value{font-size:14px;font-weight:700;color:var(--brand-ink);margin-top:4px}';
            echo '.data-table{border-collapse:collapse;width:100%;margin-top:6px}';
            echo '.data-table th,.data-table td{border:1px solid var(--brand-line);padding:6px 8px;text-align:left;font-size:11px}';
            echo '.data-table th{background:#f3f4f6;font-weight:600}';
            echo '.data-table tbody tr:nth-child(even) td{background:#fbfbfc}';
            echo '.footer{margin-top:24px;font-size:10px;color:var(--brand-muted);border-top:1px solid var(--brand-line);padding-top:10px}';
            echo '.footer-table{width:100%;border-collapse:collapse}';
            echo '.footer-table td{font-size:10px;color:var(--brand-muted)}';
            echo '.text-right{text-align:right}';
            echo '</style></head><body>';

            echo '<div class="header">';
            echo '<table class="header-table"><tr>';
            echo '<td class="logo-cell">';
            if ($logoDataUri) {
                echo '<img src="'.$escape($logoDataUri).'" alt="'.$escape($companyName).'" />';
            }
            echo '</td>';
            echo '<td>';
            echo '<div class="company">'.$escape($companyName).'</div>';
            echo '<div class="report-title">'.$escape($title).'</div>';
            if ($addressLine !== '') {
                echo '<div class="address">'.$escape($addressLine).'</div>';
            }
            echo '</td>';
            echo '</tr></table>';
            echo '</div>';

            echo '<div class="meta">';
            echo '<table class="meta-table">';
            echo '<tr>';
            echo '<td><div class="meta-label">Report Type</div>'.$escape($typeLabel).'</td>';
            echo '<td><div class="meta-label">Report Date</div>'.$escape($formatDate($report->report_date ?? '')).'</td>';
            echo '<td><div class="meta-label">Generated</div>'.$escape($report->generated_date?->format($formatting['datetime_format'] ?? 'Y-m-d H:i') ?? '').'</td>';
            echo '<td><div class="meta-label">Prepared By</div>'.$escape($report->generated_by ?? 'System').'</td>';
            echo '</tr>';
            echo '<tr>';
            echo '<td><div class="meta-label">Report ID</div>'.$escape($report->id).'</td>';
            if ($taxId) {
                echo '<td><div class="meta-label">TIN</div>'.$escape($taxId).'</td>';
            } else {
                echo '<td></td>';
            }
            echo '<td><div class="meta-label">Contact</div>'.$escape($contactPhone).'</td>';
            echo '<td><div class="meta-label">Email</div>'.$escape($contactEmail).'</td>';
            echo '</tr>';
            if ($website !== '') {
                echo '<tr>';
                echo '<td colspan="4"><div class="meta-label">Website</div>'.$escape($website).'</td>';
                echo '</tr>';
            }
            echo '</table>';
            echo '</div>';

            foreach ($sections as [$sectionTitle, $sectionHtml]) {
                echo '<div class="section">';
                echo '<h2>'.$escape($sectionTitle).'</h2>';
                echo $sectionHtml;
                echo '</div>';
            }

            echo '<div class="footer">';
            echo '<table class="footer-table"><tr>';
            echo '<td>'.$escape($footerLeft).'</td>';
            echo '<td class="text-right">Confidential - For internal use only</td>';
            echo '</tr></table>';
            echo '</div>';
            echo '</body></html>';

            return (string) ob_get_clean();
        })();
    }

    private function streamPdfReport(Report $report): StreamedResponse
    {
        $filename = sprintf('%s-%s.pdf', $report->report_type, $report->report_date);

        if (! class_exists(\Dompdf\Dompdf::class)) {
            throw new \RuntimeException('PDF export requires Dompdf. Run: composer require barryvdh/laravel-dompdf');
        }

        $html = $this->buildReportHtml($report);

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
