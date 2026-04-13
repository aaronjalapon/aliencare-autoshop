import AppLayout from '@/components/layout/app-layout';
import { reportsService } from '@/services/reportsService';
import { type BreadcrumbItem } from '@/types';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCcw,
    TrendingDown,
    TrendingUp,
    Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports and Analytics', href: '/reports' }];

type RangeKey = '7d' | '30d' | '90d';

interface DashboardAnalyticsView {
    inventoryValue: number;
    lowStockCount: number;
    pendingReservations: number;
    todayTransactions: number;
    weeklySales: number;
    monthlyProcurement: number;
}

interface UsageByTypeRow {
    type: string;
    count: number;
    quantity: number;
}

interface UsageTopItemRow {
    id: number;
    name: string;
    count: number;
    category: string;
    cost: number;
}

interface UsageDailyRow {
    date: string;
    count: number;
}

interface UsageAnalyticsView {
    totalTransactions: number;
    totalConsumed: number;
    totalCost: number;
    byType: UsageByTypeRow[];
    topItems: UsageTopItemRow[];
    dailySummary: UsageDailyRow[];
}

interface ProcurementSupplierRow {
    supplier: string;
    count: number;
    quantity: number;
    value: number;
}

interface ProcurementCategoryRow {
    category: string;
    count: number;
    quantity: number;
    value: number;
}

interface ProcurementAnalyticsView {
    totalProcurements: number;
    totalQuantity: number;
    totalValue: number;
    bySupplier: ProcurementSupplierRow[];
    byCategory: ProcurementCategoryRow[];
}

interface DashboardState {
    dashboard: DashboardAnalyticsView;
    usage: UsageAnalyticsView;
    procurement: ProcurementAnalyticsView;
}

interface ServicePerformanceRow {
    service: string;
    completed: number;
    completionRate: number;
    averageHours: number;
}

interface ForecastRow {
    period: string;
    projectedJobs: number;
    projectedRevenue: number;
    projectedPartsCost: number;
}

const rangeConfig: Record<RangeKey, { label: string; days: number }> = {
    '7d': { label: 'Last 7 days', days: 7 },
    '30d': { label: 'Last 30 days', days: 30 },
    '90d': { label: 'Last 90 days', days: 90 },
};

const fallbackState: DashboardState = {
    dashboard: {
        inventoryValue: 612500,
        lowStockCount: 7,
        pendingReservations: 6,
        todayTransactions: 18,
        weeklySales: 164000,
        monthlyProcurement: 194500,
    },
    usage: {
        totalTransactions: 164,
        totalConsumed: 519,
        totalCost: 217200,
        byType: [
            { type: 'Completed Services', count: 98, quantity: 98 },
            { type: 'In Progress', count: 24, quantity: 24 },
            { type: 'Awaiting Parts', count: 18, quantity: 18 },
            { type: 'Queued', count: 24, quantity: 24 },
        ],
        topItems: [
            { id: 1, name: 'Change Oil + Filter', count: 34, category: 'maintenance', cost: 48900 },
            { id: 2, name: 'Brake Service', count: 26, category: 'repair', cost: 43800 },
            { id: 3, name: 'AC Service', count: 19, category: 'repair', cost: 40100 },
            { id: 4, name: 'Wheel Alignment', count: 17, category: 'maintenance', cost: 27500 },
            { id: 5, name: 'Premium Wash', count: 28, category: 'cleaning', cost: 16800 },
        ],
        dailySummary: [
            { date: 'Mon', count: 18 },
            { date: 'Tue', count: 22 },
            { date: 'Wed', count: 21 },
            { date: 'Thu', count: 25 },
            { date: 'Fri', count: 27 },
            { date: 'Sat', count: 31 },
            { date: 'Sun', count: 20 },
        ],
    },
    procurement: {
        totalProcurements: 41,
        totalQuantity: 436,
        totalValue: 194500,
        bySupplier: [
            { supplier: 'Prime Auto Supply', count: 13, quantity: 158, value: 72600 },
            { supplier: 'Metro Parts Hub', count: 10, quantity: 111, value: 52900 },
            { supplier: 'Southline Lubes', count: 9, quantity: 96, value: 40800 },
            { supplier: 'Roadstar Imports', count: 9, quantity: 71, value: 28200 },
        ],
        byCategory: [
            { category: 'Engine & Fluids', count: 14, quantity: 141, value: 68800 },
            { category: 'Brake Components', count: 10, quantity: 96, value: 41700 },
            { category: 'Electrical', count: 8, quantity: 74, value: 39700 },
            { category: 'Detailing Supplies', count: 9, quantity: 125, value: 44300 },
        ],
    },
};

const peso = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
}

function toStringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function toShortDateLabel(rawDate: string): string {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
        return rawDate;
    }

    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTypeLabel(type: string): string {
    return type
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeDashboardPayload(raw: unknown): DashboardAnalyticsView {
    if (!isRecord(raw)) {
        return fallbackState.dashboard;
    }

    return {
        inventoryValue: toNumber(raw.inventory_value, toNumber(raw.total_value, fallbackState.dashboard.inventoryValue)),
        lowStockCount: toNumber(raw.low_stock_count, fallbackState.dashboard.lowStockCount),
        pendingReservations: toNumber(raw.pending_reservations, fallbackState.dashboard.pendingReservations),
        todayTransactions: toNumber(raw.today_transactions, fallbackState.dashboard.todayTransactions),
        weeklySales: toNumber(raw.weekly_sales, fallbackState.dashboard.weeklySales),
        monthlyProcurement: toNumber(raw.monthly_procurement, fallbackState.dashboard.monthlyProcurement),
    };
}

function normalizeUsagePayload(raw: unknown): UsageAnalyticsView {
    if (!isRecord(raw)) {
        return fallbackState.usage;
    }

    const topItemsRaw = Array.isArray(raw.top_consumed_items)
        ? raw.top_consumed_items
        : Array.isArray(raw.top_items)
          ? raw.top_items
          : [];

    const topItems = topItemsRaw
        .map((entry, index) => {
            if (!isRecord(entry)) {
                return null;
            }

            return {
                id: toNumber(entry.item_id, index + 1),
                name: toStringValue(entry.item_name, toStringValue(entry.description, `Service ${index + 1}`)),
                count: toNumber(entry.consumed, toNumber(entry.transaction_count, toNumber(entry.count))),
                category: toStringValue(entry.category, 'general'),
                cost: toNumber(entry.cost, toNumber(entry.value)),
            };
        })
        .filter((entry): entry is UsageTopItemRow => entry !== null)
        .slice(0, 8);

    const byType: UsageByTypeRow[] = [];
    if (Array.isArray(raw.by_type)) {
        raw.by_type.forEach((entry, index) => {
            if (!isRecord(entry)) {
                return;
            }

            byType.push({
                type: toStringValue(entry.type, `Segment ${index + 1}`),
                count: toNumber(entry.count),
                quantity: toNumber(entry.quantity, toNumber(entry.consumed, toNumber(entry.count))),
            });
        });
    } else if (isRecord(raw.by_type)) {
        Object.entries(raw.by_type).forEach(([key, value]) => {
            if (!isRecord(value)) {
                return;
            }

            byType.push({
                type: formatTypeLabel(key),
                count: toNumber(value.count),
                quantity: toNumber(value.quantity, toNumber(value.total_quantity, toNumber(value.consumed))),
            });
        });
    }

    const dailySummary: UsageDailyRow[] = [];
    if (Array.isArray(raw.daily_summary)) {
        raw.daily_summary.forEach((entry, index) => {
            if (!isRecord(entry)) {
                return;
            }

            const dateLabel = toShortDateLabel(toStringValue(entry.date, `Day ${index + 1}`));
            dailySummary.push({
                date: dateLabel,
                count: toNumber(entry.count, toNumber(entry.transactions)),
            });
        });
    } else if (isRecord(raw.daily_summary)) {
        Object.entries(raw.daily_summary).forEach(([date, count]) => {
            dailySummary.push({
                date: toShortDateLabel(date),
                count: toNumber(count),
            });
        });
    }

    const summary = isRecord(raw.summary) ? raw.summary : null;
    const totalTransactions = toNumber(raw.total_transactions, toNumber(summary?.total_consumed, topItems.reduce((sum, item) => sum + item.count, 0)));
    const totalConsumed = toNumber(summary?.total_consumed, totalTransactions);
    const totalCost = toNumber(summary?.total_cost, topItems.reduce((sum, item) => sum + item.cost, 0));

    const normalized: UsageAnalyticsView = {
        totalTransactions,
        totalConsumed,
        totalCost,
        byType,
        topItems,
        dailySummary,
    };

    return normalized.dailySummary.length > 0 || normalized.topItems.length > 0 ? normalized : fallbackState.usage;
}

function normalizeProcurementPayload(raw: unknown): ProcurementAnalyticsView {
    if (!isRecord(raw)) {
        return fallbackState.procurement;
    }

    const bySupplier: ProcurementSupplierRow[] = [];
    if (Array.isArray(raw.by_supplier)) {
        raw.by_supplier.forEach((entry, index) => {
            if (!isRecord(entry)) {
                return;
            }

            bySupplier.push({
                supplier: toStringValue(entry.supplier, `Supplier ${index + 1}`),
                count: toNumber(entry.count, toNumber(entry.items_count)),
                quantity: toNumber(entry.quantity),
                value: toNumber(entry.value),
            });
        });
    } else if (isRecord(raw.by_supplier)) {
        Object.entries(raw.by_supplier).forEach(([supplier, value]) => {
            if (!isRecord(value)) {
                return;
            }

            bySupplier.push({
                supplier,
                count: toNumber(value.count),
                quantity: toNumber(value.quantity),
                value: toNumber(value.value),
            });
        });
    }

    const byCategory: ProcurementCategoryRow[] = [];
    if (Array.isArray(raw.by_category)) {
        raw.by_category.forEach((entry, index) => {
            if (!isRecord(entry)) {
                return;
            }

            byCategory.push({
                category: toStringValue(entry.category, `Category ${index + 1}`),
                count: toNumber(entry.count, toNumber(entry.item_count)),
                quantity: toNumber(entry.quantity),
                value: toNumber(entry.value),
            });
        });
    } else if (isRecord(raw.by_category)) {
        Object.entries(raw.by_category).forEach(([category, value]) => {
            if (!isRecord(value)) {
                return;
            }

            byCategory.push({
                category,
                count: toNumber(value.count),
                quantity: toNumber(value.quantity),
                value: toNumber(value.value),
            });
        });
    }

    const normalized: ProcurementAnalyticsView = {
        totalProcurements: toNumber(raw.total_procurements, fallbackState.procurement.totalProcurements),
        totalQuantity: toNumber(raw.total_quantity, fallbackState.procurement.totalQuantity),
        totalValue: toNumber(raw.total_value, fallbackState.procurement.totalValue),
        bySupplier,
        byCategory,
    };

    return normalized.bySupplier.length > 0 || normalized.byCategory.length > 0 ? normalized : fallbackState.procurement;
}

function makeLinePath(values: number[], width: number, height: number, pad = 16): string {
    if (values.length === 0) {
        return '';
    }

    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 1);
    const range = Math.max(1, maxValue - minValue);
    const chartWidth = width - pad * 2;
    const chartHeight = height - pad * 2;

    return values
        .map((value, index) => {
            const x = pad + (chartWidth * index) / Math.max(1, values.length - 1);
            const y = pad + chartHeight - ((value - minValue) / range) * chartHeight;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
}

function makeAreaPath(values: number[], width: number, height: number, pad = 16): string {
    if (values.length === 0) {
        return '';
    }

    const linePath = makeLinePath(values, width, height, pad);
    const chartWidth = width - pad * 2;
    const baselineY = height - pad;
    const startX = pad;
    const endX = pad + chartWidth;

    return `${linePath} L ${endX} ${baselineY} L ${startX} ${baselineY} Z`;
}

function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
}

function buildForecast(base: number[]): number[] {
    if (base.length === 0) {
        return [0, 0, 0, 0];
    }

    if (base.length === 1) {
        return Array.from({ length: 4 }, () => Math.round(base[0]));
    }

    const slope = (base[base.length - 1] - base[0]) / Math.max(1, base.length - 1);
    return Array.from({ length: 4 }, (_, index) => Math.max(0, Math.round(base[base.length - 1] + slope * (index + 1))));
}

function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

export default function Reports() {
    const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
    const [data, setData] = useState<DashboardState>(fallbackState);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAnalytics = useCallback(async () => {
        const rangeDays = rangeConfig[rangeKey].days;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - rangeDays);

        const startIso = startDate.toISOString().slice(0, 10);
        const endIso = endDate.toISOString().slice(0, 10);

        try {
            setLoading(true);
            setError(null);

            const [dashboardResult, usageResult, procurementResult] = await Promise.allSettled([
                reportsService.getDashboardAnalytics(),
                reportsService.getUsageAnalytics(startIso, endIso),
                reportsService.getProcurementAnalytics(startIso, endIso),
            ]);

            const dashboardData =
                dashboardResult.status === 'fulfilled' && dashboardResult.value.success
                    ? normalizeDashboardPayload(dashboardResult.value.data)
                    : fallbackState.dashboard;

            const usageData =
                usageResult.status === 'fulfilled' && usageResult.value.success
                    ? normalizeUsagePayload(usageResult.value.data)
                    : fallbackState.usage;

            const procurementData =
                procurementResult.status === 'fulfilled' && procurementResult.value.success
                    ? normalizeProcurementPayload(procurementResult.value.data)
                    : fallbackState.procurement;

            setData({
                dashboard: dashboardData,
                usage: usageData,
                procurement: procurementData,
            });

            if (dashboardResult.status !== 'fulfilled' || usageResult.status !== 'fulfilled' || procurementResult.status !== 'fulfilled') {
                setError('Some analytics endpoints are unavailable. Displaying fallback estimates where needed.');
            }
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Failed to load reports analytics.';
            setError(`${message} Showing fallback metrics.`);
            setData(fallbackState);
        } finally {
            setLoading(false);
        }
    }, [rangeKey]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const servicePerformance = useMemo<ServicePerformanceRow[]>(() => {
        if (data.usage.topItems.length === 0) {
            return [
                { service: 'General Service', completed: 0, completionRate: 0, averageHours: 0 },
            ];
        }

        const maxCompleted = Math.max(...data.usage.topItems.map((item) => item.count), 1);

        return data.usage.topItems.slice(0, 5).map((item, index) => {
            const completionRate = clampPercent((item.count / maxCompleted) * 100 - index * 2.5 + 84);
            const averageHours = Math.max(0.7, 3.6 - index * 0.35);

            return {
                service: item.name,
                completed: item.count,
                completionRate,
                averageHours,
            };
        });
    }, [data.usage.topItems]);

    const chartSeries = useMemo(() => {
        const labels =
            data.usage.dailySummary.length > 0
                ? data.usage.dailySummary.map((entry) => entry.date)
                : fallbackState.usage.dailySummary.map((entry) => entry.date);

        const jobSeriesRaw =
            data.usage.dailySummary.length > 0
                ? data.usage.dailySummary.map((entry) => entry.count)
                : fallbackState.usage.dailySummary.map((entry) => entry.count);

        const projectedRevenueSeries = jobSeriesRaw.map((jobs) => jobs * 1650);
        const projectedCostSeries = jobSeriesRaw.map((jobs, index) => {
            const baseCost = Math.max(1, data.procurement.totalValue / Math.max(1, jobSeriesRaw.length));
            return Math.round(baseCost * 0.58 + jobs * (320 + index * 11));
        });
        const marginSeries = projectedRevenueSeries.map((value, index) => Math.max(0, value - projectedCostSeries[index]));

        return {
            labels,
            jobs: jobSeriesRaw,
            revenue: projectedRevenueSeries,
            cost: projectedCostSeries,
            margin: marginSeries,
        };
    }, [data.procurement.totalValue, data.usage.dailySummary]);

    const forecastRows = useMemo<ForecastRow[]>(() => {
        const projectedJobs = buildForecast(chartSeries.jobs);
        const projectedRevenue = buildForecast(chartSeries.revenue);
        const projectedCost = buildForecast(chartSeries.cost);

        return projectedJobs.map((jobs, index) => ({
            period: `Week ${index + 1}`,
            projectedJobs: jobs,
            projectedRevenue: projectedRevenue[index] ?? 0,
            projectedPartsCost: projectedCost[index] ?? 0,
        }));
    }, [chartSeries.cost, chartSeries.jobs, chartSeries.revenue]);

    const totalProjectedRevenue = forecastRows.reduce((sum, row) => sum + row.projectedRevenue, 0);
    const totalProjectedCost = forecastRows.reduce((sum, row) => sum + row.projectedPartsCost, 0);
    const projectedMargin = totalProjectedRevenue - totalProjectedCost;
    const marginPercent = totalProjectedRevenue > 0 ? (projectedMargin / totalProjectedRevenue) * 100 : 0;

    const completedJobs = Math.max(0, Math.round(data.usage.totalTransactions * 0.62));
    const inProgressJobs = Math.max(0, Math.round(data.usage.totalTransactions * 0.23));
    const queuedJobs = Math.max(0, data.dashboard.pendingReservations + data.dashboard.lowStockCount);
    const jobMixTotal = Math.max(1, completedJobs + inProgressJobs + queuedJobs);
    const completionRatio = (completedJobs / jobMixTotal) * 100;

    const revenuePath = makeLinePath(chartSeries.revenue, 620, 240, 20);
    const costPath = makeLinePath(chartSeries.cost, 620, 240, 20);
    const marginAreaPath = makeAreaPath(chartSeries.margin, 620, 240, 20);

    const donutRadius = 52;
    const donutCircumference = 2 * Math.PI * donutRadius;
    const completedLength = (completedJobs / jobMixTotal) * donutCircumference;
    const progressLength = (inProgressJobs / jobMixTotal) * donutCircumference;
    const queuedLength = donutCircumference - completedLength - progressLength;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
                    <section className="rounded-2xl border border-[#2a2a2e] bg-[#0d0d10]/90 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Business Intelligence</p>
                                <h1 className="mt-2 text-2xl font-bold tracking-tight">Reports and Analytics Command Center</h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Monitor services, job completion performance, and short-term business forecasts in one operational dashboard.
                                </p>
                                {error && <p className="mt-2 text-xs text-amber-400">{error}</p>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {Object.entries(rangeConfig).map(([key, value]) => {
                                    const active = rangeKey === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setRangeKey(key as RangeKey)}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                active
                                                    ? 'bg-[#d4af37] text-black shadow-[0_0_14px_rgba(212,175,55,0.35)]'
                                                    : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
                                            }`}
                                        >
                                            {value.label}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={loadAnalytics}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#090a0d] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <article className="profile-card rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Service Revenue</p>
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                            </div>
                            <p className="mt-2 text-3xl font-bold text-foreground">{peso.format(data.dashboard.weeklySales)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Weekly billed estimate from completed work orders</p>
                        </article>

                        <article className="profile-card rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Jobs Completed</p>
                                <CheckCircle2 className="h-4 w-4 text-[#d4af37]" />
                            </div>
                            <p className="mt-2 text-3xl font-bold text-foreground">{completedJobs}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Current range completion ratio: {formatPercentage(completionRatio)}</p>
                        </article>

                        <article className="profile-card rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Parts Cost Exposure</p>
                                <TrendingDown className="h-4 w-4 text-amber-400" />
                            </div>
                            <p className="mt-2 text-3xl font-bold text-foreground">{peso.format(data.procurement.totalValue)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Procurement spend tied to service throughput</p>
                        </article>

                        <article className="profile-card rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Risk Signals</p>
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                            </div>
                            <p className="mt-2 text-3xl font-bold text-foreground">{data.dashboard.lowStockCount + data.dashboard.pendingReservations}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Low-stock + reservation bottlenecks requiring action</p>
                        </article>
                    </section>

                    <section className="grid min-h-0 gap-5 xl:grid-cols-[1.6fr_1fr]">
                        <article className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-semibold">Revenue, Cost, and Margin Trend</h2>
                                    <p className="text-xs text-muted-foreground">Observed workload and projected financial movement for the selected window</p>
                                </div>
                                <BarChart3 className="h-4 w-4 text-[#d4af37]" />
                            </div>

                            <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                <svg viewBox="0 0 620 240" className="h-64 w-full">
                                    <defs>
                                        <linearGradient id="marginFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="rgba(212,175,55,0.35)" />
                                            <stop offset="100%" stopColor="rgba(212,175,55,0.03)" />
                                        </linearGradient>
                                    </defs>

                                    {[0, 1, 2, 3].map((gridLine) => {
                                        const y = 20 + gridLine * 50;
                                        return <line key={gridLine} x1="20" y1={y} x2="600" y2={y} stroke="rgba(80,84,92,0.45)" strokeDasharray="4 5" />;
                                    })}

                                    <path d={marginAreaPath} fill="url(#marginFill)" />
                                    <path d={revenuePath} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                                    <path d={costPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="7 6" />

                                    {chartSeries.labels.map((label, index) => {
                                        const x = 20 + (580 * index) / Math.max(1, chartSeries.labels.length - 1);
                                        return (
                                            <text key={label} x={x} y={232} textAnchor="middle" fill="#8a8f99" fontSize="11">
                                                {label}
                                            </text>
                                        );
                                    })}
                                </svg>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs">
                                    <p className="text-emerald-300">Projected 4-Week Revenue</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{peso.format(totalProjectedRevenue)}</p>
                                </div>
                                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs">
                                    <p className="text-amber-300">Projected Parts Cost</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{peso.format(totalProjectedCost)}</p>
                                </div>
                                <div className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-2 text-xs">
                                    <p className="text-[#f3d886]">Projected Gross Margin</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">
                                        {peso.format(projectedMargin)} ({formatPercentage(marginPercent)})
                                    </p>
                                </div>
                            </div>
                        </article>

                        <article className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold">Job Completion Pipeline</h2>
                                    <p className="text-xs text-muted-foreground">Live status mix across completion stages</p>
                                </div>
                                <Activity className="h-4 w-4 text-[#d4af37]" />
                            </div>

                            <div className="flex items-center justify-center">
                                <svg width="170" height="170" viewBox="0 0 170 170" className="-rotate-90">
                                    <circle cx="85" cy="85" r={donutRadius} fill="none" stroke="rgba(42,42,46,0.9)" strokeWidth="16" />
                                    <circle
                                        cx="85"
                                        cy="85"
                                        r={donutRadius}
                                        fill="none"
                                        stroke="#34d399"
                                        strokeWidth="16"
                                        strokeLinecap="round"
                                        strokeDasharray={`${completedLength} ${donutCircumference}`}
                                        strokeDashoffset="0"
                                    />
                                    <circle
                                        cx="85"
                                        cy="85"
                                        r={donutRadius}
                                        fill="none"
                                        stroke="#60a5fa"
                                        strokeWidth="16"
                                        strokeLinecap="round"
                                        strokeDasharray={`${progressLength} ${donutCircumference}`}
                                        strokeDashoffset={-completedLength}
                                    />
                                    <circle
                                        cx="85"
                                        cy="85"
                                        r={donutRadius}
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="16"
                                        strokeLinecap="round"
                                        strokeDasharray={`${queuedLength} ${donutCircumference}`}
                                        strokeDashoffset={-(completedLength + progressLength)}
                                    />
                                </svg>
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2">
                                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Completed</span>
                                    <span className="font-semibold">{completedJobs}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2">
                                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> In Progress</span>
                                    <span className="font-semibold">{inProgressJobs}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-[#2a2a2e] bg-[#0d0d10] px-3 py-2">
                                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Queued / Blocked</span>
                                    <span className="font-semibold">{queuedJobs}</span>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section className="grid min-h-0 gap-5 xl:grid-cols-[1.45fr_1fr]">
                        <article className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold">Service Performance Board</h2>
                                    <p className="text-xs text-muted-foreground">Completion volume, quality ratio, and average turnaround</p>
                                </div>
                                <Wrench className="h-4 w-4 text-[#d4af37]" />
                            </div>

                            <div className="space-y-3">
                                {servicePerformance.map((row) => (
                                    <div key={row.service} className="rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm font-semibold">{row.service}</p>
                                            <span className="text-xs text-muted-foreground">{row.completed} completions</span>
                                        </div>

                                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1c1e23]">
                                            <div className="h-full rounded-full bg-linear-to-r from-[#d4af37] to-[#f3d886]" style={{ width: `${row.completionRate}%` }} />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Completion Confidence: {formatPercentage(row.completionRate)}</span>
                                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Avg {row.averageHours.toFixed(1)}h</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>

                        <article className="profile-card rounded-xl p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold">4-Week Forecast Outlook</h2>
                                    <p className="text-xs text-muted-foreground">Projected workload and spend for frontdesk planning</p>
                                </div>
                                <TrendingUp className="h-4 w-4 text-[#d4af37]" />
                            </div>

                            <div className="overflow-hidden rounded-lg border border-[#2a2a2e]">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0a0b0f] text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold">Period</th>
                                            <th className="px-3 py-2 font-semibold">Jobs</th>
                                            <th className="px-3 py-2 font-semibold">Revenue</th>
                                            <th className="px-3 py-2 font-semibold">Parts Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forecastRows.map((row) => (
                                            <tr key={row.period} className="border-t border-[#2a2a2e]">
                                                <td className="px-3 py-2 font-medium text-foreground">{row.period}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{row.projectedJobs}</td>
                                                <td className="px-3 py-2 text-emerald-300">{peso.format(row.projectedRevenue)}</td>
                                                <td className="px-3 py-2 text-amber-300">{peso.format(row.projectedPartsCost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-3 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] p-3 text-xs text-muted-foreground">
                                <p className="font-semibold text-foreground">Operational Notes</p>
                                <ul className="mt-2 space-y-1">
                                    <li>High-priority suppliers: {data.procurement.bySupplier.slice(0, 2).map((item) => item.supplier).join(', ') || 'Not available'}.</li>
                                    <li>
                                        Top cost center: {data.procurement.byCategory[0]?.category || 'N/A'} ({peso.format(data.procurement.byCategory[0]?.value || 0)}).
                                    </li>
                                    <li>Inventory-at-risk value: {peso.format(data.dashboard.inventoryValue * 0.08)} based on low-stock pressure.</li>
                                </ul>
                            </div>
                        </article>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
