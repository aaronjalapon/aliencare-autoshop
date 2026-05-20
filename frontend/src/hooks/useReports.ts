import { dateRangeFromDays, isRecord, toNumber, toStringValue } from '@/lib/reports-utils';
import { reportsService } from '@/services/reportsService';
import { useCallback, useEffect, useState } from 'react';

export interface DashboardView {
    inventoryValue: number;
    lowStockCount: number;
    pendingReservations: number;
    todayTransactions: number;
    weeklySales: number;
    monthlyProcurement: number;
    totalItems: number;
    activeReservations: number;
    jobPipeline: { completed: number; inProgress: number; queued: number };
    recentTransactions: Array<{
        id: number;
        itemId: number;
        type: string;
        quantity: number;
        createdAt: string;
        itemName: string;
    }>;
    topCategories: Array<{ category: string; count: number; value: number }>;
    monthlyTrends: Array<{ month: string; procurementValue: number; usageValue: number }>;
}

export interface UsageItemView {
    itemId: number;
    itemName: string;
    partNumber: string;
    description: string;
    category: string;
    consumed: number;
    cost: number;
    unitPrice: number;
    transactionCount: number;
}

export interface UsageView {
    startDate: string;
    endDate: string;
    totalTransactions: number;
    totalConsumed: number;
    totalCost: number;
    uniqueItemsUsed: number;
    activeCategories: number;
    mostUsedItem: { partNumber: string; itemName: string; consumed: number } | null;
    byType: Array<{ type: string; count: number; quantity: number }>;
    byCategory: Array<{ category: string; consumed: number; cost: number; itemCount: number }>;
    topItems: UsageItemView[];
    dailySummary: Array<{ date: string; count: number }>;
    allItems: UsageItemView[];
}

export interface ProcurementView {
    startDate: string;
    endDate: string;
    totalProcurements: number;
    totalQuantity: number;
    totalValue: number;
    bySupplier: Array<{ supplier: string; count: number; quantity: number; value: number; itemsCount: number }>;
    byCategory: Array<{ category: string; count: number; quantity: number; value: number; itemCount: number }>;
    monthlyBreakdown: Array<{ month: string; quantity: number; value: number }>;
}

export interface ReportsState {
    dashboard: DashboardView;
    usage: UsageView;
    procurement: ProcurementView;
}

function emptyDashboard(): DashboardView {
    return {
        inventoryValue: 0,
        lowStockCount: 0,
        pendingReservations: 0,
        todayTransactions: 0,
        weeklySales: 0,
        monthlyProcurement: 0,
        totalItems: 0,
        activeReservations: 0,
        jobPipeline: { completed: 0, inProgress: 0, queued: 0 },
        recentTransactions: [],
        topCategories: [],
        monthlyTrends: [],
    };
}

function emptyUsage(start: string, end: string): UsageView {
    return {
        startDate: start,
        endDate: end,
        totalTransactions: 0,
        totalConsumed: 0,
        totalCost: 0,
        uniqueItemsUsed: 0,
        activeCategories: 0,
        mostUsedItem: null,
        byType: [],
        byCategory: [],
        topItems: [],
        dailySummary: [],
        allItems: [],
    };
}

function emptyProcurement(start: string, end: string): ProcurementView {
    return {
        startDate: start,
        endDate: end,
        totalProcurements: 0,
        totalQuantity: 0,
        totalValue: 0,
        bySupplier: [],
        byCategory: [],
        monthlyBreakdown: [],
    };
}

function normalizeUsageItem(raw: unknown, index: number): UsageItemView {
    if (!isRecord(raw)) {
        return {
            itemId: index,
            itemName: 'Unknown',
            partNumber: 'N/A',
            description: '',
            category: 'General',
            consumed: 0,
            cost: 0,
            unitPrice: 0,
            transactionCount: 0,
        };
    }
    const itemId = toNumber(raw.item_id, index);
    return {
        itemId,
        itemName: toStringValue(raw.item_name, `Item ${itemId}`),
        partNumber: toStringValue(raw.part_number, `ITEM-${itemId}`),
        description: toStringValue(raw.description),
        category: toStringValue(raw.category, 'General'),
        consumed: toNumber(raw.consumed, toNumber(raw.transaction_count)),
        cost: toNumber(raw.cost),
        unitPrice: toNumber(raw.unit_price),
        transactionCount: toNumber(raw.transaction_count),
    };
}

function normalizeDashboard(raw: unknown): DashboardView {
    if (!isRecord(raw)) return emptyDashboard();
    const pipeline = isRecord(raw.job_pipeline) ? raw.job_pipeline : null;
    const txns = Array.isArray(raw.recent_transactions) ? raw.recent_transactions : [];
    const cats = Array.isArray(raw.top_categories) ? raw.top_categories : [];
    const trends = Array.isArray(raw.monthly_trends) ? raw.monthly_trends : [];

    return {
        inventoryValue: toNumber(raw.inventory_value, toNumber(raw.total_value)),
        lowStockCount: toNumber(raw.low_stock_count),
        pendingReservations: toNumber(raw.pending_reservations),
        todayTransactions: toNumber(raw.today_transactions),
        weeklySales: toNumber(raw.weekly_sales),
        monthlyProcurement: toNumber(raw.monthly_procurement),
        totalItems: toNumber(raw.total_items),
        activeReservations: toNumber(raw.active_reservations),
        jobPipeline: {
            completed: toNumber(pipeline?.completed),
            inProgress: toNumber(pipeline?.in_progress),
            queued: toNumber(pipeline?.queued),
        },
        recentTransactions: txns.map((t) => {
            const inv = isRecord(t.inventory_item) ? t.inventory_item : null;
            return {
                id: toNumber(t.id),
                itemId: toNumber(t.item_id),
                type: toStringValue(t.transaction_type),
                quantity: toNumber(t.quantity),
                createdAt: toStringValue(t.created_at),
                itemName: toStringValue(inv?.item_name, 'Unknown'),
            };
        }),
        topCategories: cats.map((c) => ({
            category: toStringValue(c.category),
            count: toNumber(c.count),
            value: toNumber(c.value),
        })),
        monthlyTrends: trends.map((t) => ({
            month: toStringValue(t.month),
            procurementValue: toNumber(t.procurement_value),
            usageValue: toNumber(t.usage_value),
        })),
    };
}

function normalizeUsage(raw: unknown, start: string, end: string): UsageView {
    if (!isRecord(raw)) return emptyUsage(start, end);
    const dateRange = isRecord(raw.date_range) ? raw.date_range : null;
    const summary = isRecord(raw.summary) ? raw.summary : null;
    const byTypeRaw = isRecord(raw.by_type) ? raw.by_type : {};
    const catBreakdown = Array.isArray(raw.category_breakdown) ? raw.category_breakdown : [];
    const topItemsRaw = Array.isArray(raw.top_consumed_items) ? raw.top_consumed_items : Array.isArray(raw.top_items) ? raw.top_items : [];
    const dailyRaw = Array.isArray(raw.daily_summary) ? raw.daily_summary : [];
    const allRaw = Array.isArray(raw.usage_by_item) ? raw.usage_by_item : [];

    const allItems = allRaw.map((item, i) => normalizeUsageItem(item, i));
    const topItems = topItemsRaw.map((item, i) => normalizeUsageItem(item, i)).slice(0, 10);

    const mostUsedItem = (() => {
        const fromSummary = summary && isRecord(summary.most_used_item) ? summary.most_used_item : null;
        if (fromSummary) {
            return {
                partNumber: toStringValue(fromSummary.part_number),
                itemName: toStringValue(fromSummary.item_name),
                consumed: toNumber(fromSummary.consumed),
            };
        }
        const best = topItems[0];
        return best ? { partNumber: best.partNumber, itemName: best.itemName, consumed: best.consumed } : null;
    })();

    return {
        startDate: toStringValue(dateRange?.start_date, start),
        endDate: toStringValue(dateRange?.end_date, end),
        totalTransactions: toNumber(summary?.total_transactions, toNumber(raw.total_transactions)),
        totalConsumed: toNumber(
            summary?.total_consumed,
            allItems.reduce((s, i) => s + i.consumed, 0),
        ),
        totalCost: toNumber(
            summary?.total_cost,
            allItems.reduce((s, i) => s + i.cost, 0),
        ),
        uniqueItemsUsed: toNumber(summary?.unique_items_used, allItems.length),
        activeCategories: toNumber(summary?.active_categories),
        mostUsedItem,
        byType: Object.entries(byTypeRaw).map(([type, v]) => ({
            type,
            count: toNumber(isRecord(v) ? v.count : 0),
            quantity: toNumber(isRecord(v) ? v.quantity : 0),
        })),
        byCategory: catBreakdown.map((c) => ({
            category: toStringValue(c.category),
            consumed: toNumber(c.consumed),
            cost: toNumber(c.cost),
            itemCount: toNumber(c.item_count),
        })),
        topItems,
        dailySummary: dailyRaw.map((d) => ({ date: toStringValue(d.date), count: toNumber(d.count) })),
        allItems,
    };
}

function normalizeProcurement(raw: unknown, start: string, end: string): ProcurementView {
    if (!isRecord(raw)) return emptyProcurement(start, end);
    const dateRange = isRecord(raw.date_range) ? raw.date_range : null;
    const suppliers = Array.isArray(raw.by_supplier) ? raw.by_supplier : [];
    const categories = Array.isArray(raw.by_category) ? raw.by_category : [];
    const monthly = Array.isArray(raw.monthly_breakdown) ? raw.monthly_breakdown : [];

    return {
        startDate: toStringValue(dateRange?.start_date, start),
        endDate: toStringValue(dateRange?.end_date, end),
        totalProcurements: toNumber(raw.total_procurements),
        totalQuantity: toNumber(raw.total_quantity, toNumber(raw.total_procured)),
        totalValue: toNumber(raw.total_value),
        bySupplier: suppliers.map((s) => ({
            supplier: toStringValue(s.supplier),
            count: toNumber(s.count),
            quantity: toNumber(s.quantity),
            value: toNumber(s.value),
            itemsCount: toNumber(s.items_count),
        })),
        byCategory: categories.map((c) => ({
            category: toStringValue(c.category),
            count: toNumber(c.count),
            quantity: toNumber(c.quantity),
            value: toNumber(c.value),
            itemCount: toNumber(c.item_count),
        })),
        monthlyBreakdown: monthly.map((m) => ({
            month: toStringValue(m.month),
            quantity: toNumber(m.quantity),
            value: toNumber(m.value),
        })),
    };
}

export function useReports(days: number) {
    const [data, setData] = useState<ReportsState>(() => {
        const { startDate, endDate } = dateRangeFromDays(days);
        return { dashboard: emptyDashboard(), usage: emptyUsage(startDate, endDate), procurement: emptyProcurement(startDate, endDate) };
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [partialErrors, setPartialErrors] = useState<string[]>([]);

    const fetchAll = useCallback(async () => {
        const { startDate, endDate } = dateRangeFromDays(days);
        setLoading(true);
        setError(null);
        setPartialErrors([]);

        try {
            const [dashRes, usageRes, procRes] = await Promise.allSettled([
                reportsService.getDashboardAnalytics(startDate, endDate),
                reportsService.getUsageAnalytics(startDate, endDate),
                reportsService.getProcurementAnalytics(startDate, endDate),
            ]);

            const failed: string[] = [];

            const dashboard =
                dashRes.status === 'fulfilled' && dashRes.value.success
                    ? normalizeDashboard(dashRes.value.data)
                    : (failed.push('dashboard'), emptyDashboard());

            const usage =
                usageRes.status === 'fulfilled' && usageRes.value.success
                    ? normalizeUsage(usageRes.value.data, startDate, endDate)
                    : (failed.push('usage'), emptyUsage(startDate, endDate));

            const procurement =
                procRes.status === 'fulfilled' && procRes.value.success
                    ? normalizeProcurement(procRes.value.data, startDate, endDate)
                    : (failed.push('procurement'), emptyProcurement(startDate, endDate));

            setData({ dashboard, usage, procurement });

            if (failed.length === 3) {
                setError('All analytics endpoints failed. Please check your connection and try again.');
            } else if (failed.length > 0) {
                setPartialErrors(failed);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return { data, loading, error, partialErrors, refetch: fetchAll };
}
