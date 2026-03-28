import { AlertCircle, Download, FileText, Loader2, Package, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useUsageReports } from '../../hooks/useUsageReports';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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

    const { data, loading, error, refetch } = useUsageReports({
        reportPeriod,
        selectedCategory,
    });

    // Get unique categories from the data
    const categories = data ? [...new Set(data.category_breakdown.map((cat) => cat.category))] : [];

    const exportReport = () => {
        if (!data) return;

        const csvContent = [
            'Part Number,Description,Consumed,Cost,Category,Unit Price,Transaction Count',
            ...data.usage_by_item.map(
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

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
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
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card className="border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Total Parts Consumed</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{data.summary.total_consumed}</div>
                        <p className="text-xs text-muted-foreground">{reportPeriod} period</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Total Cost</CardTitle>
                        <PesoIcon className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">₱{data.summary.total_cost.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Parts consumption value</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Most Used Part</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-foreground">{data.summary.most_used_item?.part_number || 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">{data.summary.most_used_item?.consumed || 0} units consumed</p>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Active Categories</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{data.summary.active_categories}</div>
                        <p className="text-xs text-muted-foreground">Categories with usage</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-foreground">Consumption by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-start gap-8 lg:flex-row">
                            {/* Pie Chart */}
                            <div className="flex flex-1 justify-center">
                                <div className="relative">
                                    <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90 transform">
                                        {(() => {
                                            const filteredData = data.category_breakdown.filter((cat) => cat.consumed > 0);
                                            const total = filteredData.reduce((sum, cat) => sum + cat.consumed, 0);
                                            let cumulativePercentage = 0;
                                            // System color palette - golden, amber, orange, purple, red
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

                                                const pathData = [`M 140 140`, `L ${x1} ${y1}`, `A 90 90 0 ${largeArc} 1 ${x2} ${y2}`, 'Z'].join(' ');

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

                                    {/* Center label */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-sm font-medium text-muted-foreground">Total</div>
                                            <div className="text-lg font-bold text-foreground">
                                                {data.category_breakdown.reduce((sum, cat) => sum + cat.consumed, 0)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">units</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-4">
                                <h4 className="mb-3 font-semibold text-foreground">Category Breakdown</h4>
                                {data.category_breakdown
                                    .filter((cat) => cat.consumed > 0)
                                    .sort((a, b) => b.consumed - a.consumed)
                                    .map((cat, index) => {
                                        const total = data.category_breakdown.reduce((sum, c) => sum + c.consumed, 0);
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
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-8">
                        <CardTitle className="text-foreground">Top Consumed Parts</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-10">
                            {/* Bar Chart */}
                            <div className="relative mt-8">
                                <div className="flex h-72 items-end justify-between gap-4 rounded-lg bg-muted/20 p-6">
                                    {data.top_consumed_items.slice(0, 5).map((item, index) => {
                                        const maxConsumed = Math.max(...data.top_consumed_items.slice(0, 5).map((d) => d.consumed));
                                        const barHeight = maxConsumed > 0 ? (item.consumed / maxConsumed) * 200 : 0;
                                        // System color palette - golden, amber, orange, purple, red
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
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

                                                        {/* Shimmer effect on hover */}
                                                        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />
                                                    </div>
                                                </div>

                                                {/* Part info below bar */}
                                                <div className="mt-4 max-w-[90px] text-center">
                                                    <div className="truncate text-sm font-semibold text-foreground">{item.part_number}</div>
                                                    <div className="mt-1 text-xs font-medium text-muted-foreground">₱{item.cost.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Y-axis labels */}
                                <div className="absolute top-6 bottom-16 left-0 flex flex-col justify-between text-xs text-muted-foreground">
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const maxConsumed = Math.max(...data.top_consumed_items.slice(0, 5).map((d) => d.consumed));
                                        const value = Math.round((maxConsumed * (4 - i)) / 4);
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
                                {data.top_consumed_items.slice(0, 5).map((item, index) => {
                                    const colors = ['#dfb400', '#f59e0b', '#f97316', '#a855f7', '#ef4444'];
                                    return (
                                        <div
                                            key={`legend-${item.item_id}`}
                                            className="group rounded-lg p-3 transition-all duration-200 hover:bg-muted/30"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    <div
                                                        className="h-4 w-4 flex-shrink-0 rounded-sm border-2 border-background shadow-sm"
                                                        style={{ backgroundColor: colors[index % colors.length] }}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-foreground">{item.part_number}</div>
                                                        <div className="truncate text-sm text-muted-foreground">{item.description}</div>
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex-shrink-0 text-right">
                                                    <div className="font-bold text-foreground">{item.consumed} units</div>
                                                    <div className="text-sm text-muted-foreground">₱{item.cost.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-foreground">Detailed Usage Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border">
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
                                {data.usage_by_item
                                    .sort((a, b) => b.consumed - a.consumed)
                                    .map((item) => {
                                        const usageIntensity = item.consumed > 10 ? 'HIGH' : item.consumed > 5 ? 'MEDIUM' : 'LOW';
                                        return (
                                            <TableRow key={item.item_id} className="border-border hover:bg-muted/50">
                                                <TableCell className="font-medium text-foreground">{item.part_number}</TableCell>
                                                <TableCell className="max-w-[200px] truncate text-foreground" title={item.description}>
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
                                                            usageIntensity === 'HIGH'
                                                                ? 'destructive'
                                                                : usageIntensity === 'MEDIUM'
                                                                  ? 'default'
                                                                  : 'secondary'
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
                    {data.usage_by_item.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground">No usage data found for the selected period and category</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
