import AppLayout from '@/components/layout/app-layout';
import { useReports, type DashboardView, type ProcurementView, type UsageView } from '@/hooks/useReports';
import { clampPercent, formatCurrency, formatPercentage, formatTypeLabel, toShortDateLabel } from '@/lib/reports-utils';
import { auditService } from '@/services/auditService';
import { reportsService, type ReportFilters } from '@/services/reportsService';
import { type BreadcrumbItem } from '@/types';
import { type AuditLog, type Report } from '@/types/inventory';
import {
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock3,
    FileText,
    Filter,
    Loader2,
    Package,
    RefreshCcw,
    TrendingDown,
    TrendingUp,
    Truck,
    Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports and Analytics', href: '/reports' }];

type TabKey = 'overview' | 'usage' | 'procurement' | 'reports' | 'history';
type RangeKey = 'daily' | '7d' | '30d' | '90d' | 'custom';

const RANGE_CONFIG: Record<RangeKey, { label: string; days: number | null }> = {
    daily: { label: 'Today', days: 0 },
    '7d': { label: '7 days', days: 7 },
    '30d': { label: '30 days', days: 30 },
    '90d': { label: '90 days', days: 90 },
    custom: { label: 'Custom', days: null },
};

const TABS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'usage', label: 'Usage', icon: TrendingDown },
    { key: 'procurement', label: 'Procurement', icon: Truck },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'history', label: 'History', icon: FileText },
];

const GOLD = '#d4af37';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KpiCard({
    label,
    value,
    subtitle,
    icon: Icon,
    accentClass,
}: {
    label: string;
    value: string;
    subtitle: string;
    icon: React.ElementType;
    accentClass?: string;
}) {
    return (
        <article className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/90 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
                <Icon className={`h-4 w-4 ${accentClass ?? 'text-[#d4af37]'}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </article>
    );
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-lg bg-[#1c1e23] ${className ?? ''}`} />;
}

function KpiSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/90 p-4">
                    <Skeleton className="mb-3 h-3 w-20" />
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="mt-2 h-3 w-36" />
                </div>
            ))}
        </div>
    );
}

function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
    return (
        <div className={`rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-4 ${height} flex items-center justify-center`}>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{message}</span>
            {onRetry && (
                <button onClick={onRetry} className="text-xs font-semibold text-red-200 underline hover:text-white">
                    Retry
                </button>
            )}
        </div>
    );
}

function PartialErrorBanner({ endpoints }: { endpoints: string[] }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Could not load: {endpoints.join(', ')}. Showing available data.</span>
        </div>
    );
}

function TabButton({ tab, active, onClick }: { tab: (typeof TABS)[number]; active: boolean; onClick: () => void }) {
    const Icon = tab.icon;
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                active
                    ? 'bg-[#d4af37] text-black shadow-[0_0_14px_rgba(212,175,55,0.3)]'
                    : 'border border-[#2a2a2e] text-muted-foreground hover:border-[#d4af37]/40 hover:text-foreground'
            }`}
        >
            <Icon className="h-4 w-4" />
            {tab.label}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  SVG Chart Helpers                                                  */
/* ------------------------------------------------------------------ */

function linePath(values: number[], w: number, h: number, pad = 20): string {
    if (values.length === 0) return '';
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 1);
    const range = Math.max(1, maxV - minV);
    const cw = w - pad * 2;
    const ch = h - pad * 2;
    return values
        .map((v, i) => {
            const x = pad + (cw * i) / Math.max(1, values.length - 1);
            const y = pad + ch - ((v - minV) / range) * ch;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
}

function areaPath(values: number[], w: number, h: number, pad = 20): string {
    const lp = linePath(values, w, h, pad);
    if (!lp) return '';
    const baseline = h - pad;
    const endX = w - pad;
    return `${lp} L ${endX} ${baseline} L ${pad} ${baseline} Z`;
}

function GridLines({ w, h, pad, count }: { w: number; h: number; pad: number; count: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => {
                const y = pad + ((h - pad * 2) * i) / (count - 1);
                return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(80,84,92,0.35)" strokeDasharray="4 5" />;
            })}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Donut Chart                                                        */
/* ------------------------------------------------------------------ */

function DonutChart({
    segments,
    size = 170,
    radius = 52,
    thickness = 16,
}: {
    segments: { value: number; color: string; label: string }[];
    size?: number;
    radius?: number;
    thickness?: number;
}) {
    const total = Math.max(
        1,
        segments.reduce((s, seg) => s + seg.value, 0),
    );
    const circ = 2 * Math.PI * radius;
    const center = size / 2;
    let offset = 0;

    return (
        <div className="flex flex-col items-center gap-3">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(42,42,46,0.9)" strokeWidth={thickness} />
                {segments.map((seg, i) => {
                    const length = Math.max(0, (seg.value / total) * circ);
                    const dashArray = `${length} ${circ}`;
                    const currentOffset = -offset;
                    offset += length;
                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={thickness}
                            strokeLinecap="round"
                            strokeDasharray={dashArray}
                            strokeDashoffset={currentOffset}
                        />
                    );
                })}
            </svg>
            <div className="space-y-2 text-sm">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between gap-6">
                        <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                            {seg.label}
                        </span>
                        <span className="font-semibold">{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Bar Chart                                                          */
/* ------------------------------------------------------------------ */

function BarChart({
    items,
    valueKey,
    labelKey,
    maxBars,
    color,
}: {
    items: Record<string, unknown>[];
    valueKey: string;
    labelKey: string;
    maxBars?: number;
    color?: string;
}) {
    const sliced = (maxBars ? items.slice(0, maxBars) : items).reverse();
    const maxVal = Math.max(1, ...sliced.map((item) => Number(item[valueKey]) || 0));
    const barColor = color ?? GOLD;

    return (
        <div className="flex h-56 items-end gap-3 px-2">
            {sliced.map((item, i) => {
                const val = Number(item[valueKey]) || 0;
                const pct = (val / maxVal) * 100;
                return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{val}</span>
                        <div
                            className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                            style={{ height: `${Math.max(4, pct)}%`, backgroundColor: barColor, minHeight: 4 }}
                        />
                        <span className="max-w-[60px] truncate text-center text-[11px] text-muted-foreground" title={String(item[labelKey] ?? '')}>
                            {String(item[labelKey] ?? '').slice(0, 10)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Line Chart (SVG)                                                   */
/* ------------------------------------------------------------------ */

function LineChart({
    series,
    width = 600,
    height = 220,
    pad = 20,
}: {
    series: { label: string; values: number[]; color: string; dashed?: boolean }[];
    width?: number;
    height?: number;
    pad?: number;
}) {
    const allValues = series.flatMap((s) => s.values);
    if (allValues.length === 0) {
        return <p className="py-12 text-center text-sm text-muted-foreground">No trend data available.</p>;
    }

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
            <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(212,175,55,0.3)" />
                    <stop offset="100%" stopColor="rgba(212,175,55,0.02)" />
                </linearGradient>
            </defs>

            <GridLines w={width} h={height} pad={pad} count={4} />

            {series.map((s, si) => {
                if (si === 0) {
                    const ap = areaPath(s.values, width, height, pad);
                    return ap ? <path key="area" d={ap} fill="url(#areaFill)" /> : null;
                }
                return null;
            })}

            {series.map((s, si) => {
                const lp = linePath(s.values, width, height, pad);
                return lp ? (
                    <path
                        key={si}
                        d={lp}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={si === 0 ? 2.5 : 2}
                        strokeLinecap="round"
                        strokeDasharray={s.dashed ? '6 5' : undefined}
                    />
                ) : null;
            })}
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
    title,
    subtitle,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <article className={`rounded-xl border border-[#2a2a2e] bg-[#0d0d10]/90 p-5 ${className ?? ''}`}>
            <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
                <Icon className="h-4 w-4 text-[#d4af37]" />
            </div>
            {children}
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Overview Tab                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({ dash, usage, proc }: { dash: DashboardView; usage: UsageView; proc: ProcurementView }) {
    const pipelineTotal = Math.max(1, dash.jobPipeline.completed + dash.jobPipeline.inProgress + dash.jobPipeline.queued);
    const completionRatio = (dash.jobPipeline.completed / pipelineTotal) * 100;

    const trendSeries = useMemo(() => {
        if (dash.monthlyTrends.length === 0) {
            const labels = usage.dailySummary.map((d) => d.date);
            const costFromProc = proc.monthlyBreakdown.map((m) => m.value);
            return {
                labels,
                revenue: usage.dailySummary.map((_, i) => proc.totalValue * 0.36 * (i + 1)),
                cost: costFromProc.length > 0 ? costFromProc : usage.dailySummary.map(() => proc.totalValue * 0.08),
            };
        }
        return {
            labels: dash.monthlyTrends.map((t) => t.month),
            revenue: dash.monthlyTrends.map((t) => t.usageValue),
            cost: dash.monthlyTrends.map((t) => t.procurementValue),
        };
    }, [dash.monthlyTrends, usage.dailySummary, proc.monthlyBreakdown, proc.totalValue]);

    return (
        <div className="flex flex-col gap-5">
            {/* KPI Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    label="Service Revenue"
                    value={formatCurrency(dash.weeklySales)}
                    subtitle="Weekly billed estimate"
                    icon={TrendingUp}
                    accentClass="text-emerald-400"
                />
                <KpiCard
                    label="Jobs Completed"
                    value={String(dash.jobPipeline.completed)}
                    subtitle={`Completion ratio: ${formatPercentage(completionRatio)}`}
                    icon={CheckCircle2}
                />
                <KpiCard
                    label="Parts Cost"
                    value={formatCurrency(proc.totalValue)}
                    subtitle="Procurement spend"
                    icon={TrendingDown}
                    accentClass="text-amber-400"
                />
                <KpiCard
                    label="Needs Attention"
                    value={String(dash.lowStockCount + dash.pendingReservations)}
                    subtitle="Low-stock items + pending reservations"
                    icon={AlertTriangle}
                    accentClass="text-red-400"
                />
            </div>

            {/* Charts row */}
            <div className="grid min-h-0 gap-5 lg:grid-cols-[1.6fr_1fr]">
                <Section title="Revenue & Cost Trend" subtitle="Monthly financial movement" icon={BarChart3}>
                    <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                        <LineChart
                            series={[
                                { label: 'Revenue', values: trendSeries.revenue, color: '#34d399' },
                                { label: 'Cost', values: trendSeries.cost, color: '#f59e0b', dashed: true },
                            ]}
                        />
                    </div>
                    <div className="mt-1 flex items-center gap-4 px-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Revenue
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Cost
                        </span>
                    </div>
                </Section>

                <Section title="Job Pipeline" subtitle="Status distribution" icon={Clock3}>
                    <DonutChart
                        segments={[
                            { value: dash.jobPipeline.completed, color: '#34d399', label: 'Completed' },
                            { value: dash.jobPipeline.inProgress, color: '#60a5fa', label: 'In Progress' },
                            { value: dash.jobPipeline.queued, color: '#f59e0b', label: 'Queued / Blocked' },
                        ]}
                    />
                </Section>
            </div>

            {/* Categories + Recent Activity */}
            <div className="grid min-h-0 gap-5 lg:grid-cols-[1fr_1fr]">
                <Section title="Top Categories" subtitle="By inventory value" icon={Package}>
                    {dash.topCategories.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No category data available.</p>
                    ) : (
                        <div className="space-y-2">
                            {dash.topCategories.map((cat, i) => {
                                const maxVal = dash.topCategories[0]?.value || 1;
                                const pct = (cat.value / maxVal) * 100;
                                return (
                                    <div key={i} className="rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-foreground">{cat.category}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {cat.count} items &middot; {formatCurrency(cat.value)}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1c1e23]">
                                            <div className="h-full rounded-full bg-[#d4af37]" style={{ width: `${clampPercent(pct)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>

                <Section title="Recent Transactions" subtitle="Last 7 days" icon={ActivityIcon}>
                    {dash.recentTransactions.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No recent transactions.</p>
                    ) : (
                        <div className="max-h-64 space-y-1.5 overflow-y-auto">
                            {dash.recentTransactions.slice(0, 8).map((txn) => (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between rounded-md border border-[#2a2a2e] bg-[#0a0b0f] px-3 py-2 text-xs"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className={`h-2 w-2 shrink-0 rounded-full ${
                                                txn.type === 'sale' ? 'bg-emerald-400' : txn.type === 'procurement' ? 'bg-blue-400' : 'bg-amber-400'
                                            }`}
                                        />
                                        <span className="truncate text-foreground">{txn.itemName}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className="text-muted-foreground capitalize">{formatTypeLabel(txn.type)}</span>
                                        <span className="font-medium text-foreground">
                                            {txn.quantity > 0 ? '+' : ''}
                                            {txn.quantity}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
}

function ActivityIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Usage Tab                                                          */
/* ------------------------------------------------------------------ */

function UsageTab({ usage }: { usage: UsageView }) {
    return (
        <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Parts Consumed" value={String(usage.totalConsumed)} subtitle="Total units used" icon={Package} />
                <KpiCard
                    label="Total Cost"
                    value={formatCurrency(usage.totalCost)}
                    subtitle="Value of parts consumed"
                    icon={TrendingDown}
                    accentClass="text-amber-400"
                />
                <KpiCard
                    label="Unique Items"
                    value={String(usage.uniqueItemsUsed)}
                    subtitle={`Across ${usage.activeCategories} categories`}
                    icon={BarChart3}
                />
                <KpiCard
                    label="Top Consumed"
                    value={usage.mostUsedItem?.partNumber ?? 'N/A'}
                    subtitle={usage.mostUsedItem ? `${usage.mostUsedItem.consumed} units` : 'No data'}
                    icon={TrendingUp}
                    accentClass="text-emerald-400"
                />
            </div>

            <div className="grid min-h-0 gap-5 lg:grid-cols-2">
                <Section title="Daily Usage Trend" subtitle="Transaction count per day" icon={BarChart3}>
                    {usage.dailySummary.length === 0 ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">No daily data for this period.</p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0a0b0f] p-3">
                            <LineChart series={[{ label: 'Transactions', values: usage.dailySummary.map((d) => d.count), color: GOLD }]} />
                            <div className="flex justify-between px-2">
                                {usage.dailySummary.slice(0, Math.min(7, usage.dailySummary.length)).map((d, i) => (
                                    <span key={i} className="text-[11px] text-muted-foreground">
                                        {toShortDateLabel(d.date)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </Section>

                <Section title="Usage by Category" subtitle="Distribution across categories" icon={Package}>
                    {usage.byCategory.length === 0 ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">No category data.</p>
                    ) : (
                        <BarChart items={usage.byCategory} valueKey="consumed" labelKey="category" maxBars={6} color="#60a5fa" />
                    )}
                </Section>
            </div>

            <Section title="Top Consumed Items" subtitle="By quantity consumed" icon={Wrench}>
                {usage.topItems.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No consumption data available.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Item</th>
                                    <th className="px-3 py-2 font-semibold">Category</th>
                                    <th className="px-3 py-2 text-right font-semibold">Consumed</th>
                                    <th className="px-3 py-2 text-right font-semibold">Cost</th>
                                    <th className="px-3 py-2 text-right font-semibold">Transactions</th>
                                    <th className="px-3 py-2 font-semibold">Intensity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usage.topItems.map((item) => {
                                    const intensity = item.consumed > 15 ? 'HIGH' : item.consumed > 5 ? 'MEDIUM' : 'LOW';
                                    return (
                                        <tr key={item.itemId} className="border-t border-[#2a2a2e]">
                                            <td className="px-3 py-2 font-medium text-foreground">{item.partNumber}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{item.category}</td>
                                            <td className="px-3 py-2 text-right text-foreground">{item.consumed}</td>
                                            <td className="px-3 py-2 text-right text-foreground">{formatCurrency(item.cost)}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">{item.transactionCount}</td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                        intensity === 'HIGH'
                                                            ? 'bg-red-500/20 text-red-300'
                                                            : intensity === 'MEDIUM'
                                                              ? 'bg-amber-500/20 text-amber-300'
                                                              : 'bg-emerald-500/20 text-emerald-300'
                                                    }`}
                                                >
                                                    {intensity}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Procurement Tab                                                    */
/* ------------------------------------------------------------------ */

function ProcurementTab({ proc }: { proc: ProcurementView }) {
    return (
        <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Total Procurements" value={String(proc.totalProcurements)} subtitle="Transactions in range" icon={Truck} />
                <KpiCard label="Total Quantity" value={String(proc.totalQuantity)} subtitle="Units procured" icon={Package} />
                <KpiCard
                    label="Total Value"
                    value={formatCurrency(proc.totalValue)}
                    subtitle="Amount spent"
                    icon={TrendingDown}
                    accentClass="text-amber-400"
                />
                <KpiCard
                    label="Suppliers"
                    value={String(proc.bySupplier.length)}
                    subtitle="Unique suppliers"
                    icon={Truck}
                    accentClass="text-emerald-400"
                />
            </div>

            <div className="grid min-h-0 gap-5 lg:grid-cols-2">
                <Section title="Procurement by Supplier" subtitle="Value distribution" icon={Truck}>
                    {proc.bySupplier.length === 0 ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">No supplier data.</p>
                    ) : (
                        <BarChart items={proc.bySupplier} valueKey="value" labelKey="supplier" maxBars={6} color={GOLD} />
                    )}
                </Section>

                <Section title="Monthly Breakdown" subtitle="Procurement value by month" icon={Calendar}>
                    {proc.monthlyBreakdown.length === 0 ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">No monthly data.</p>
                    ) : (
                        <BarChart items={proc.monthlyBreakdown} valueKey="value" labelKey="month" maxBars={6} color="#60a5fa" />
                    )}
                </Section>
            </div>

            <Section title="Supplier Details" subtitle="Full breakdown of procurement sources" icon={FileText}>
                {proc.bySupplier.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No supplier data available.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Supplier</th>
                                    <th className="px-3 py-2 text-right font-semibold">Transactions</th>
                                    <th className="px-3 py-2 text-right font-semibold">Quantity</th>
                                    <th className="px-3 py-2 text-right font-semibold">Value</th>
                                    <th className="px-3 py-2 text-right font-semibold">Unique Items</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proc.bySupplier.map((s, i) => (
                                    <tr key={i} className="border-t border-[#2a2a2e]">
                                        <td className="px-3 py-2 font-medium text-foreground">{s.supplier}</td>
                                        <td className="px-3 py-2 text-right text-foreground">{s.count}</td>
                                        <td className="px-3 py-2 text-right text-foreground">{s.quantity}</td>
                                        <td className="px-3 py-2 text-right text-foreground">{formatCurrency(s.value)}</td>
                                        <td className="px-3 py-2 text-right text-muted-foreground">{s.itemsCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  History Tab                                                        */
/* ------------------------------------------------------------------ */

function HistoryTab() {
    const [archives, setArchives] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const fetchArchives = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await auditService.getAuditLogs({
                entity_type: entityFilter,
                action: actionFilter || undefined,
                per_page: 25,
                page: currentPage,
            });

            if (res.success && res.data) {
                const paginatedData = res.data;
                setArchives(paginatedData.data ?? []);
                setLastPage(paginatedData.last_page ?? 1);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch history');
        } finally {
            setLoading(false);
        }
    }, [entityFilter, actionFilter, currentPage]);

    useEffect(() => {
        fetchArchives();
    }, [fetchArchives]);

    const entityOptions = [
        { value: 'all', label: 'All Entities' },
        { value: 'job_order', label: 'Job Orders' },
        { value: 'job_order_item', label: 'Job Order Items' },
        { value: 'service', label: 'Services' },
        { value: 'inventory', label: 'Inventory' },
        { value: 'reservation', label: 'Reservations' },
        { value: 'transaction', label: 'Transactions' },
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                    value={entityFilter}
                    onChange={(e) => {
                        setEntityFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 py-2 text-xs text-foreground"
                >
                    {entityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <input
                    value={actionFilter}
                    onChange={(e) => {
                        setActionFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    placeholder="Filter action (optional)"
                    className="h-9 rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 text-xs text-foreground placeholder:text-muted-foreground"
                />
                <button
                    onClick={fetchArchives}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                >
                    <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* History list */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : error ? (
                <ErrorBanner message={error} onRetry={fetchArchives} />
            ) : archives.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#2a2a2e] bg-[#0d0d10]/90 py-12 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">No history events found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-[#2a2a2e]">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#0a0b0f] text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Entity</th>
                                <th className="px-4 py-3 font-semibold">Action</th>
                                <th className="px-4 py-3 font-semibold">Reference</th>
                                <th className="px-4 py-3 font-semibold">When</th>
                                <th className="px-4 py-3 font-semibold">By</th>
                                <th className="px-4 py-3 text-right font-semibold">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {archives.map((entry) => (
                                <tr key={entry.archive_id ?? entry.id} className="border-t border-[#2a2a2e] hover:bg-[#0a0b0f]/50">
                                    <td className="px-4 py-2.5 font-medium text-foreground capitalize">{formatTypeLabel(entry.entity_type)}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{formatTypeLabel(entry.action)}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{entry.reference_number ?? String(entry.entity_id)}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{entry.archived_date?.slice(0, 19).replace('T', ' ')}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{entry.user_id ?? 'System'}</td>
                                    <td className="px-4 py-2.5 text-right text-muted-foreground">{entry.notes ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex items-center justify-between border-t border-[#2a2a2e] px-4 py-3 text-xs text-muted-foreground">
                        <span>
                            Page {currentPage} of {lastPage}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage <= 1}
                                className="rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))}
                                disabled={currentPage >= lastPage}
                                className="rounded-md border border-[#2a2a2e] px-2 py-1 text-[11px] disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Reports Tab                                                       */
/* ------------------------------------------------------------------ */

function ReportsTab() {
    const { success, error: toastError } = useToast();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [generating, setGenerating] = useState<string | null>(null);
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [reconStart, setReconStart] = useState<string>(new Date().toISOString().slice(0, 10));
    const [reconEnd, setReconEnd] = useState<string>(new Date().toISOString().slice(0, 10));

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: ReportFilters = { per_page: 50 };
            if (typeFilter) {
                filters.report_type = typeFilter as ReportFilters['report_type'];
            }
            const res = await reportsService.getReports(filters);
            if (res.success && res.data) {
                setReports(res.data.data ?? []);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    }, [typeFilter]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleGenerateDaily = async () => {
        setGenerating('daily_usage');
        try {
            await reportsService.generateDailyUsageReport({ date: reportDate });
            success('Daily usage report created successfully.');
            await fetchReports();
        } catch (e) {
            toastError(e instanceof Error ? e.message : 'Failed to generate daily usage report.');
        } finally {
            setGenerating(null);
        }
    };

    const handleGenerateReconciliation = async () => {
        setGenerating('reconciliation');
        try {
            await reportsService.generateReconciliationReport({ start_date: reconStart, end_date: reconEnd });
            success('Reconciliation report created successfully.');
            await fetchReports();
        } catch (e) {
            toastError(e instanceof Error ? e.message : 'Failed to generate reconciliation report.');
        } finally {
            setGenerating(null);
        }
    };

    const handleExport = async (reportId: number, format: 'pdf' | 'csv') => {
        try {
            const blob = await reportsService.exportReport(reportId, format);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${reportId}.${format === 'pdf' ? 'html' : 'csv'}`;
            a.click();
            window.URL.revokeObjectURL(url);
            success('Export completed successfully.');
        } catch (e) {
            toastError(e instanceof Error ? e.message : 'Export failed.');
        }
    };

    const reportTypeOptions = ['daily_usage', 'monthly_procurement', 'reconciliation', 'low_stock'];

    return (
        <div className="flex flex-col gap-5">
            <Section title="Report Actions" subtitle="Generate daily usage and end-of-day reconciliation" icon={FileText}>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr]">
                    <div className="rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] p-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Daily Usage</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <input
                                type="date"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                className="h-9 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-xs text-foreground"
                            />
                            <button
                                onClick={handleGenerateDaily}
                                disabled={generating === 'daily_usage'}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-3 py-2 text-xs font-semibold text-black disabled:opacity-60"
                            >
                                {generating === 'daily_usage' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                                Generate Daily Usage
                            </button>
                        </div>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] p-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">End-of-Day Reconciliation</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <input
                                type="date"
                                value={reconStart}
                                onChange={(e) => setReconStart(e.target.value)}
                                className="h-9 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-xs text-foreground"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <input
                                type="date"
                                value={reconEnd}
                                onChange={(e) => setReconEnd(e.target.value)}
                                className="h-9 rounded-lg border border-[#2a2a2e] bg-[#0d0d10] px-3 text-xs text-foreground"
                            />
                            <button
                                onClick={handleGenerateReconciliation}
                                disabled={generating === 'reconciliation'}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-3 py-2 text-xs font-semibold text-black disabled:opacity-60"
                            >
                                {generating === 'reconciliation' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                                Run Reconciliation
                            </button>
                        </div>
                    </div>
                </div>
            </Section>

            <Section title="Archived Reports" subtitle="Stored for auditing and export" icon={FileText}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 py-2 text-xs text-foreground"
                    >
                        <option value="">All Types</option>
                        {reportTypeOptions.map((t) => (
                            <option key={t} value={t}>
                                {formatTypeLabel(t)}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={fetchReports}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground"
                    >
                        <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : error ? (
                    <ErrorBanner message={error} onRetry={fetchReports} />
                ) : reports.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No archived reports yet.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#2a2a2e]">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#0a0b0f] text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Report Date</th>
                                    <th className="px-4 py-3 font-semibold">Generated</th>
                                    <th className="px-4 py-3 font-semibold">By</th>
                                    <th className="px-4 py-3 text-right font-semibold">Export</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((r) => (
                                    <tr key={r.id} className="border-t border-[#2a2a2e] hover:bg-[#0a0b0f]/50">
                                        <td className="px-4 py-2.5 font-medium text-foreground capitalize">{formatTypeLabel(r.report_type)}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">{r.report_date}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">{r.generated_date?.slice(0, 10) ?? r.created_at?.slice(0, 10) ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">{r.generated_by ?? 'System'}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleExport(r.id, 'csv')}
                                                    className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-[#1c1e23] hover:text-foreground"
                                                >
                                                    Excel
                                                </button>
                                                <button
                                                    onClick={() => handleExport(r.id, 'pdf')}
                                                    className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-[#1c1e23] hover:text-foreground"
                                                >
                                                    PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function Reports() {
    const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
    const [customDays, setCustomDays] = useState(30);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    const effectiveDays = rangeKey === 'custom' ? customDays : (RANGE_CONFIG[rangeKey].days ?? 30);
    const { data, loading, error, partialErrors, refetch } = useReports(effectiveDays);

    const dash = data.dashboard;
    const usage = data.usage;
    const proc = data.procurement;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-full min-h-0 flex-1 overflow-hidden p-5">
                <div className="flex h-full min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
                    {/* Header */}
                    <section className="rounded-2xl border border-[#2a2a2e] bg-[#0d0d10]/90 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.18em] text-[#d4af37] uppercase">Performance Snapshot</p>
                                <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Reports & Analytics</h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Shop performance, usage trends, procurement insights, and report history.
                                    {rangeKey === 'daily' && ' Showing today.'}
                                    {rangeKey !== 'custom' && rangeKey !== 'daily' && ` Showing last ${effectiveDays} days.`}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {Object.entries(RANGE_CONFIG).map(([key, val]) => {
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
                                            {val.label}
                                        </button>
                                    );
                                })}
                                {rangeKey === 'custom' && (
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={customDays}
                                        onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value) || 30))}
                                        className="w-16 rounded-full border border-[#d4af37]/40 bg-[#0a0b0f] px-3 py-1.5 text-center text-xs font-semibold text-foreground"
                                    />
                                )}
                                <button
                                    onClick={refetch}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#0a0b0f] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[#d4af37]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {TABS.map((tab) => (
                            <TabButton key={tab.key} tab={tab} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />
                        ))}
                    </div>

                    {/* Error banners */}
                    {error && <ErrorBanner message={error} onRetry={refetch} />}
                    {partialErrors.length > 0 && <PartialErrorBanner endpoints={partialErrors} />}

                    {/* Tab content */}
                    {loading ? (
                        <div className="flex flex-col gap-5">
                            <KpiSkeleton />
                            <div className="grid gap-5 lg:grid-cols-2">
                                <ChartSkeleton />
                                <ChartSkeleton />
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab dash={dash} usage={usage} proc={proc} />}
                            {activeTab === 'usage' && <UsageTab usage={usage} />}
                            {activeTab === 'procurement' && <ProcurementTab proc={proc} />}
                            {activeTab === 'reports' && <ReportsTab />}
                            {activeTab === 'history' && <HistoryTab />}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
