import { AlertCircle, Download, FileText, Loader2, Package, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useUsageReports } from '../../hooks/useUsageReports';
import { reportsService } from '../../services/reportsService';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

// Custom Peso Icon Component
const PesoIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v18" />
        <path d="M6 8h7a3 3 0 0 0 0-6H6" />
        <path d="M6 11h7a3 3 0 0 0 0-6" />
        <path d="M4 8h10" />
        <path d="M4 11h10" />
    </svg>
);

export function UsageReports() {
    const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationMessage, setGenerationMessage] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    const { data, loading, error, refetch } = useUsageReports({
        reportPeriod,
        selectedCategory,
    });

    const exportReport = () => {
        if (!data) return;

        const usageRows = Array.isArray(data.usage_by_item) ? data.usage_by_item : [];

        const csvContent = [
            'Part Number,Description,Consumed,Cost,Category,Unit Price,Transaction Count',
            ...usageRows.map(
                (item) =>
                    `${item.part_number},"${item.description}",${item.consumed},${item.cost.toFixed(2)},${item.category},${item.unit_price},${item.transaction_count}`,
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-report-${reportPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const generateReport = async () => {
        setGenerationError(null);
        setGenerationMessage(null);

        try {
            setIsGenerating(true);

            const now = new Date();
            const todayIso = now.toISOString().split('T')[0];

            if (reportPeriod === 'daily') {
                await reportsService.generateDailyUsageReport({ date: todayIso });
                setGenerationMessage('Daily usage report generated successfully.');
            } else if (reportPeriod === 'monthly') {
                await reportsService.generateMonthlyProcurementReport({
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                });
                setGenerationMessage('Monthly procurement report generated successfully.');
            } else {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 7);

                await reportsService.generateReconciliationReport({
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                });
                setGenerationMessage('Weekly reconciliation report generated successfully.');
            }

            await refetch();
        } catch (err) {
            setGenerationError(err instanceof Error ? err.message : 'Failed to generate report.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-100 items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading usage reports...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Usage Reports</h1>
                        <p className="text-muted-foreground">Analyze parts consumption and cost tracking</p>
                    </div>
                </div>

                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load usage reports: {error}
                        <Button variant="outline" size="sm" onClick={refetch} className="ml-4">
                            Try Again
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Usage Reports</h1>
                        <p className="text-muted-foreground">Analyze parts consumption and cost tracking</p>
                    </div>
                </div>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No usage data available for the selected period.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const usageItems = Array.isArray(data.usage_by_item) ? data.usage_by_item : [];
    const categoryBreakdown = Array.isArray(data.category_breakdown) ? data.category_breakdown : [];
    const topConsumedItems = (Array.isArray(data.top_consumed_items) ? data.top_consumed_items : []).slice(0, 5);
    const sortedUsageItems = [...usageItems].sort((a, b) => b.consumed - a.consumed);
    const maxTopConsumed = topConsumedItems.length > 0 ? Math.max(...topConsumedItems.map((item) => item.consumed)) : 0;
    const totalCategoryConsumed = categoryBreakdown.reduce((sum, cat) => sum + cat.consumed, 0);
    const categories = [...new Set(categoryBreakdown.map((cat) => cat.category).filter(Boolean))];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Usage Reports</h1>
                    <p className="text-muted-foreground">
                        Analyze parts consumption and cost tracking ({data.date_range.start_date} to {data.date_range.end_date})
                    </p>
                </div>
                <div className="flex gap-4">
                    <Select value={reportPeriod} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setReportPeriod(value)}>
                        <SelectTrigger className="w-48 border-border bg-input text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                            <SelectItem value="daily">Daily Report</SelectItem>
                            <SelectItem value="weekly">Weekly Report</SelectItem>
                            <SelectItem value="monthly">Monthly Report</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-48 border-border bg-input text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={exportReport} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button onClick={generateReport} disabled={isGenerating} variant="outline" className="border-border bg-input text-foreground">
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate Report'
                        )}
                    </Button>
                </div>
            </div>

            {generationMessage && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{generationMessage}</AlertDescription>
                </Alert>
            )}

            {generationError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{generationError}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="profile-card rounded-xl">
                    <div className="flex flex-row items-center justify-between p-5 pb-2">
                        <p className="text-sm font-medium">Total Parts Consumed</p>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="p-5 pt-0">
                        <div className="text-2xl font-bold text-foreground">{data.summary.total_consumed}</div>
                        <p className="text-xs text-muted-foreground">{reportPeriod} period</p>
                    </div>
                </div>

                <div className="profile-card rounded-xl">
                    <div className="flex flex-row items-center justify-between p-5 pb-2">
                        <p className="text-sm font-medium">Total Cost</p>
                        <PesoIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="p-5 pt-0">
                        <div className="text-2xl font-bold text-foreground">₱{data.summary.total_cost.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Parts consumption value</p>
                    </div>
                </div>

                <div className="profile-card rounded-xl">
                    <div className="flex flex-row items-center justify-between p-5 pb-2">
                        <p className="text-sm font-medium">Most Used Part</p>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="p-5 pt-0">
                        <div className="text-lg font-bold text-foreground">{data.summary.most_used_item?.part_number || 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">{data.summary.most_used_item?.consumed || 0} units consumed</p>
                    </div>
                </div>

                <div className="profile-card rounded-xl">
                    <div className="flex flex-row items-center justify-between p-5 pb-2">
                        <p className="text-sm font-medium">Active Categories</p>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="p-5 pt-0">
                        <div className="text-2xl font-bold text-foreground">{data.summary.active_categories}</div>
                        <p className="text-xs text-muted-foreground">Categories with usage</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="profile-card rounded-xl">
                    <div className="p-5 pb-3">
                        <h3 className="font-semibold text-foreground">Consumption by Category</h3>
                    </div>
                    <div className="p-5 pt-0">
                        <div className="flex flex-col items-start gap-8 lg:flex-row">
                            {/* Pie Chart */}
                            <div className="flex flex-1 justify-center">
                                <div className="relative">
                                    {categoryBreakdown.filter((cat) => cat.consumed > 0).length > 0 ? (
                                        <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90 transform">
                                            {(() => {
                                                const filteredData = categoryBreakdown.filter((cat) => cat.consumed > 0);
                                                const total = filteredData.reduce((sum, cat) => sum + cat.consumed, 0);
                                                let cumulativePercentage = 0;
                                                const colors = ['#dfb400', '#f59e0b', '#f97316', '#a855f7', '#ef4444'];

                                                return filteredData.map((cat, index) => {
                                                    const percentage = (cat.consumed / total) * 100;
                                                    const startAngle = (cumulativePercentage / 100) * 360;
                                                    const endAngle = ((cumulativePercentage + percentage) / 100) * 360;

                                                    const startAngleRad = (startAngle * Math.PI) / 180;
                                                    const endAngleRad = (endAngle * Math.PI) / 180;

                                                    const largeArc = percentage > 50 ? 1 : 0;

                                                    const x1 = 140 + 90 * Math.cos(startAngleRad);
                                                    const y1 = 140 + 90 * Math.sin(startAngleRad);
                                                    const x2 = 140 + 90 * Math.cos(endAngleRad);
                                                    const y2 = 140 + 90 * Math.sin(endAngleRad);

                                                    const pathData = [`M 140 140`, `L ${x1} ${y1}`, `A 90 90 0 ${largeArc} 1 ${x2} ${y2}`, 'Z'].join(
                                                        ' ',
                                                    );

                                                    cumulativePercentage += percentage;

                                                    return (
                                                        <path
                                                            key={cat.category}
                                                            d={pathData}
                                                            fill={colors[index % colors.length]}
                                                            stroke="hsl(var(--background))"
                                                            strokeWidth="3"
                                                            className="cursor-pointer transition-all duration-200 hover:opacity-90"
                                                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                    ) : (
                                        <div className="flex h-70 w-70 items-center justify-center rounded-full border border-dashed border-border text-sm text-muted-foreground">
                                            No category usage yet
                                        </div>
                                    )}

                                    {/* Center label */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-sm font-medium text-muted-foreground">Total</div>
                                            <div className="text-lg font-bold text-foreground">{totalCategoryConsumed}</div>
                                            <div className="text-xs text-muted-foreground">units</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-4">
                                <h4 className="mb-3 font-semibold text-foreground">Category Breakdown</h4>
                                {categoryBreakdown
                                    .filter((cat) => cat.consumed > 0)
                                    .sort((a, b) => b.consumed - a.consumed)
                                    .map((cat, index) => {
                                        const total = totalCategoryConsumed;
                                        const percentage = total > 0 ? ((cat.consumed / total) * 100).toFixed(1) : '0.0';
                                        const colors = ['#dfb400', '#f59e0b', '#f97316', '#a855f7', '#ef4444'];

                                        return (
                                            <div key={cat.category} className="group rounded-lg p-3 transition-colors hover:bg-muted/50">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className="h-4 w-4 rounded-full border-2 border-background shadow-sm"
                                                            style={{ backgroundColor: colors[index % colors.length] }}
                                                        />
                                                        <div>
                                                            <div className="font-medium text-foreground">{cat.category}</div>
                                                            <div className="text-sm text-muted-foreground">₱{cat.cost.toFixed(2)} total cost</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-foreground">{cat.consumed} units</div>
                                                        <div className="text-sm text-muted-foreground">{percentage}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-card rounded-xl">
                    <div className="p-5 pb-8">
                        <h3 className="font-semibold text-foreground">Top Consumed Parts</h3>
                    </div>
                    <div className="p-5 pt-4">
                        <div className="space-y-10">
                            {/* Bar Chart */}
                            <div className="relative mt-8">
                                <div className="flex h-72 items-end justify-between gap-4 rounded-lg bg-muted/20 p-6">
                                    {topConsumedItems.length > 0 ? (
                                        topConsumedItems.map((item, index) => {
                                            const barHeight = maxTopConsumed > 0 ? (item.consumed / maxTopConsumed) * 200 : 0;
                                            const colors = ['#dfb400', '#f59e0b', '#f97316', '#a855f7', '#ef4444'];

                                            return (
                                                <div key={item.item_id} className="group flex flex-1 flex-col items-center">
                                                    {/* Value label above bar */}
                                                    <div className="mb-3 text-center">
                                                        <div className="text-lg font-bold text-foreground">{item.consumed}</div>
                                                        <div className="text-xs text-muted-foreground">units</div>
                                                    </div>

                                                    {/* Bar */}
                                                    <div className="relative flex items-end">
                                                        <div
                                                            className="relative w-16 overflow-hidden rounded-t-lg transition-all duration-500 ease-out group-hover:scale-105 group-hover:shadow-lg"
                                                            style={{
                                                                height: `${Math.max(barHeight, 8)}px`,
                                                                backgroundColor: colors[index % colors.length],
                                                                minHeight: '8px',
                                                            }}
                                                        >
                                                            {/* Gradient overlay for depth */}
                                                            <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent" />

                                                            {/* Shimmer effect on hover */}
                                                            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                                                        </div>
                                                    </div>

                                                    {/* Part info below bar */}
                                                    <div className="mt-4 max-w-22.5 text-center">
                                                        <div className="truncate text-sm font-semibold text-foreground">{item.part_number}</div>
                                                        <div className="mt-1 text-xs font-medium text-muted-foreground">₱{item.cost.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                                            No item consumption yet
                                        </div>
                                    )}
                                </div>

                                {/* Y-axis labels */}
                                <div className="absolute top-6 bottom-16 left-0 flex flex-col justify-between text-xs text-muted-foreground">
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const value = Math.round((maxTopConsumed * (4 - i)) / 4);
                                        return (
                                            <div key={i} className="flex items-center">
                                                <span className="w-6 text-right">{value}</span>
                                                <div className="ml-1 h-px w-2 bg-border" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Enhanced Legend */}
                            <div className="space-y-3 border-t border-border pt-8">
                                <h4 className="mb-4 font-semibold text-foreground">Part Details</h4>
                                {topConsumedItems.map((item, index) => {
                                    const colors = ['#dfb400', '#f59e0b', '#f97316', '#a855f7', '#ef4444'];
                                    return (
                                        <div
                                            key={`legend-${item.item_id}`}
                                            className="group rounded-lg p-3 transition-all duration-200 hover:bg-muted/30"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div
                                                        className="h-4 w-4 shrink-0 rounded-sm border-2 border-background shadow-sm"
                                                        style={{ backgroundColor: colors[index % colors.length] }}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-foreground">{item.part_number}</div>
                                                        <div className="truncate text-sm text-muted-foreground">{item.description}</div>
                                                    </div>
                                                </div>
                                                <div className="ml-4 shrink-0 text-right">
                                                    <div className="font-bold text-foreground">{item.consumed} units</div>
                                                    <div className="text-sm text-muted-foreground">₱{item.cost.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="profile-card overflow-hidden rounded-xl">
                <div className="p-5 pb-3">
                    <h3 className="font-semibold text-foreground">Detailed Usage Report</h3>
                </div>
                <div className="overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border">
                                <TableHead className="text-foreground">Part Number</TableHead>
                                <TableHead className="text-foreground">Description</TableHead>
                                <TableHead className="text-foreground">Category</TableHead>
                                <TableHead className="text-foreground">Consumed</TableHead>
                                <TableHead className="text-foreground">Total Cost</TableHead>
                                <TableHead className="text-foreground">Unit Price</TableHead>
                                <TableHead className="text-foreground">Transactions</TableHead>
                                <TableHead className="text-foreground">Usage Intensity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedUsageItems.map((item) => {
                                const usageIntensity = item.consumed > 10 ? 'HIGH' : item.consumed > 5 ? 'MEDIUM' : 'LOW';
                                return (
                                    <TableRow key={item.item_id} className="border-border hover:bg-muted/50">
                                        <TableCell className="font-medium text-foreground">{item.part_number}</TableCell>
                                        <TableCell className="max-w-50 truncate text-foreground" title={item.description}>
                                            {item.description}
                                        </TableCell>
                                        <TableCell className="text-foreground">{item.category}</TableCell>
                                        <TableCell className="text-foreground">{item.consumed}</TableCell>
                                        <TableCell className="text-foreground">₱{item.cost.toFixed(2)}</TableCell>
                                        <TableCell className="text-foreground">₱{item.unit_price}</TableCell>
                                        <TableCell className="text-foreground">{item.transaction_count}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    usageIntensity === 'HIGH' ? 'destructive' : usageIntensity === 'MEDIUM' ? 'default' : 'secondary'
                                                }
                                            >
                                                {usageIntensity}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                {usageItems.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">No usage data found for the selected period and category</div>
                )}
            </div>
        </div>
    );
}
