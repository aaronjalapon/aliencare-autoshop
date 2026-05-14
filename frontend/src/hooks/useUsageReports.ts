import { useCallback, useEffect, useState } from 'react';
import { reportsService } from '../services/reportsService';
import { inventoryEvents } from '../utils/inventoryEvents';
import { isRecord, toNumber, toStringValue } from '@/lib/reports-utils';

export interface UsageReportData {
    item_id: number;
    item_name: string;
    part_number: string;
    description: string;
    category: string;
    consumed: number;
    cost: number;
    unit_price: number;
    transaction_count: number;
}

export interface CategoryData {
    category: string;
    consumed: number;
    cost: number;
    item_count: number;
}

export interface UsageAnalytics {
    date_range: {
        start_date: string;
        end_date: string;
    };
    summary: {
        total_consumed: number;
        total_cost: number;
        unique_items_used: number;
        most_used_item: {
            part_number: string;
            item_name: string;
            consumed: number;
        } | null;
        active_categories: number;
    };
    usage_by_item: UsageReportData[];
    category_breakdown: CategoryData[];
    top_consumed_items: UsageReportData[];
}

export interface UseUsageReportsProps {
    reportPeriod?: 'daily' | 'weekly' | 'monthly';
    selectedCategory?: string;
}

function createEmptyAnalytics(startDate: string, endDate: string): UsageAnalytics {
    return {
        date_range: {
            start_date: startDate,
            end_date: endDate,
        },
        summary: {
            total_consumed: 0,
            total_cost: 0,
            unique_items_used: 0,
            most_used_item: null,
            active_categories: 0,
        },
        usage_by_item: [],
        category_breakdown: [],
        top_consumed_items: [],
    };
}

function normalizeUsageItem(raw: unknown): UsageReportData | null {
    if (!isRecord(raw)) {
        return null;
    }

    const itemId = toNumber(raw.item_id);
    const itemName = toStringValue(raw.item_name, 'Unknown Item');
    const partNumber = toStringValue(raw.part_number, itemId > 0 ? `ITEM-${itemId}` : 'N/A');
    const description = toStringValue(raw.description, 'No description available');
    const category = toStringValue(raw.category, 'General');
    const consumed = toNumber(raw.consumed, toNumber(raw.transaction_count, toNumber(raw.count)));
    const cost = toNumber(raw.cost);
    const unitPrice = toNumber(raw.unit_price);
    const transactionCount = toNumber(raw.transaction_count, toNumber(raw.count, consumed));

    return {
        item_id: itemId,
        item_name: itemName,
        part_number: partNumber,
        description,
        category,
        consumed,
        cost,
        unit_price: unitPrice,
        transaction_count: transactionCount,
    };
}

function normalizeCategoryItem(raw: unknown): CategoryData | null {
    if (!isRecord(raw)) {
        return null;
    }

    const category = toStringValue(raw.category, 'General');
    const consumed = toNumber(raw.consumed, toNumber(raw.quantity));
    const cost = toNumber(raw.cost, toNumber(raw.value));
    const itemCount = toNumber(raw.item_count, toNumber(raw.count));

    return {
        category,
        consumed,
        cost,
        item_count: itemCount,
    };
}

function deriveCategoryBreakdown(items: UsageReportData[]): CategoryData[] {
    const grouped = items.reduce<Record<string, CategoryData>>((acc, item) => {
        const key = item.category || 'General';
        if (!acc[key]) {
            acc[key] = {
                category: key,
                consumed: 0,
                cost: 0,
                item_count: 0,
            };
        }

        acc[key].consumed += item.consumed;
        acc[key].cost += item.cost;
        acc[key].item_count += 1;
        return acc;
    }, {});

    return Object.values(grouped);
}

function normalizeAnalyticsPayload(rawData: unknown, fallbackStartDate: string, fallbackEndDate: string): UsageAnalytics {
    const empty = createEmptyAnalytics(fallbackStartDate, fallbackEndDate);

    if (!isRecord(rawData)) {
        return empty;
    }

    const hasModernShape =
        Array.isArray(rawData.usage_by_item) ||
        Array.isArray(rawData.category_breakdown) ||
        Array.isArray(rawData.top_consumed_items) ||
        isRecord(rawData.summary);

    if (hasModernShape) {
        const usageByItem = Array.isArray(rawData.usage_by_item)
            ? rawData.usage_by_item.map((entry) => normalizeUsageItem(entry)).filter((entry): entry is UsageReportData => entry !== null)
            : [];

        const categoryBreakdown = Array.isArray(rawData.category_breakdown)
            ? rawData.category_breakdown.map((entry) => normalizeCategoryItem(entry)).filter((entry): entry is CategoryData => entry !== null)
            : deriveCategoryBreakdown(usageByItem);

        const topConsumedItems = Array.isArray(rawData.top_consumed_items)
            ? rawData.top_consumed_items.map((entry) => normalizeUsageItem(entry)).filter((entry): entry is UsageReportData => entry !== null)
            : [...usageByItem].sort((a, b) => b.consumed - a.consumed).slice(0, 10);

        const dateSource = isRecord(rawData.date_range) ? rawData.date_range : isRecord(rawData.period) ? rawData.period : null;

        const summarySource = isRecord(rawData.summary) ? rawData.summary : null;
        const calculatedTotalConsumed = usageByItem.reduce((sum, item) => sum + item.consumed, 0);
        const calculatedTotalCost = usageByItem.reduce((sum, item) => sum + item.cost, 0);
        const mostUsedFromItems = [...usageByItem].sort((a, b) => b.consumed - a.consumed)[0];
        const mostUsedSource = summarySource && isRecord(summarySource.most_used_item) ? summarySource.most_used_item : null;

        return {
            date_range: {
                start_date: toStringValue(dateSource?.start_date, fallbackStartDate),
                end_date: toStringValue(dateSource?.end_date, fallbackEndDate),
            },
            summary: {
                total_consumed: toNumber(summarySource?.total_consumed, calculatedTotalConsumed),
                total_cost: toNumber(summarySource?.total_cost, calculatedTotalCost),
                unique_items_used: toNumber(summarySource?.unique_items_used, usageByItem.length),
                most_used_item: mostUsedSource
                    ? {
                          part_number: toStringValue(mostUsedSource.part_number, mostUsedFromItems?.part_number || 'N/A'),
                          item_name: toStringValue(mostUsedSource.item_name, mostUsedFromItems?.item_name || 'Unknown Item'),
                          consumed: toNumber(mostUsedSource.consumed, mostUsedFromItems?.consumed || 0),
                      }
                    : mostUsedFromItems
                      ? {
                            part_number: mostUsedFromItems.part_number,
                            item_name: mostUsedFromItems.item_name,
                            consumed: mostUsedFromItems.consumed,
                        }
                      : null,
                active_categories: toNumber(summarySource?.active_categories, categoryBreakdown.filter((entry) => entry.consumed > 0).length),
            },
            usage_by_item: usageByItem,
            category_breakdown: categoryBreakdown,
            top_consumed_items: topConsumedItems,
        };
    }

    const hasLegacyShape = Array.isArray(rawData.top_items) || isRecord(rawData.by_type) || isRecord(rawData.period);
    if (!hasLegacyShape) {
        return empty;
    }

    const usageByItem = Array.isArray(rawData.top_items)
        ? rawData.top_items
              .map((entry) => {
                  if (!isRecord(entry)) {
                      return null;
                  }

                  return normalizeUsageItem({
                      item_id: entry.item_id,
                      item_name: entry.item_name,
                      part_number: entry.part_number ?? entry.item_id,
                      description: entry.description,
                      category: entry.category,
                      consumed: entry.consumed ?? entry.transaction_count ?? entry.count,
                      cost: entry.cost,
                      unit_price: entry.unit_price,
                      transaction_count: entry.transaction_count ?? entry.count,
                  });
              })
              .filter((entry): entry is UsageReportData => entry !== null)
        : [];

    const byTypeEntries = isRecord(rawData.by_type) ? Object.entries(rawData.by_type) : [];
    const categoryBreakdown = byTypeEntries.length
        ? byTypeEntries
              .map(([category, value]) =>
                  normalizeCategoryItem({
                      category,
                      consumed: isRecord(value) ? (value.quantity ?? value.consumed ?? value.count) : 0,
                      cost: isRecord(value) ? (value.cost ?? value.value) : 0,
                      item_count: isRecord(value) ? value.count : 0,
                  }),
              )
              .filter((entry): entry is CategoryData => entry !== null)
        : deriveCategoryBreakdown(usageByItem);

    const topConsumedItems = [...usageByItem].sort((a, b) => b.consumed - a.consumed).slice(0, 10);
    const dateSource = isRecord(rawData.period) ? rawData.period : null;
    const totalConsumed = usageByItem.reduce((sum, item) => sum + item.consumed, 0);
    const totalCost = usageByItem.reduce((sum, item) => sum + item.cost, 0);
    const mostUsed = topConsumedItems[0] ?? null;

    return {
        date_range: {
            start_date: toStringValue(dateSource?.start_date, fallbackStartDate),
            end_date: toStringValue(dateSource?.end_date, fallbackEndDate),
        },
        summary: {
            total_consumed: totalConsumed,
            total_cost: totalCost,
            unique_items_used: usageByItem.length,
            most_used_item: mostUsed
                ? {
                      part_number: mostUsed.part_number,
                      item_name: mostUsed.item_name,
                      consumed: mostUsed.consumed,
                  }
                : null,
            active_categories: categoryBreakdown.filter((entry) => entry.consumed > 0).length,
        },
        usage_by_item: usageByItem,
        category_breakdown: categoryBreakdown,
        top_consumed_items: topConsumedItems,
    };
}

export function useUsageReports({ reportPeriod = 'daily', selectedCategory = 'all' }: UseUsageReportsProps = {}) {
    const [data, setData] = useState<UsageAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsageData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Calculate date range based on report period
            const endDate = new Date();
            const startDate = new Date();

            switch (reportPeriod) {
                case 'daily':
                    startDate.setDate(endDate.getDate() - 1);
                    break;
                case 'weekly':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case 'monthly':
                    startDate.setMonth(endDate.getMonth() - 1);
                    break;
            }

            const fallbackStartDate = startDate.toISOString().split('T')[0];
            const fallbackEndDate = endDate.toISOString().split('T')[0];

            const response = await reportsService.getUsageAnalytics(fallbackStartDate, fallbackEndDate);

            if (response.success) {
                setData(normalizeAnalyticsPayload(response.data, fallbackStartDate, fallbackEndDate));
            } else {
                setError('Failed to fetch usage analytics');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching usage data:', err);
        } finally {
            setLoading(false);
        }
    }, [reportPeriod]);

    useEffect(() => {
        fetchUsageData();
    }, [fetchUsageData]);

    // Listen for inventory events to auto-refresh data
    useEffect(() => {
        const cleanup = inventoryEvents.listenMultiple(['inventory-updated', 'stock-transaction', 'reservation-updated'], () => {
            // Debounce the refresh to avoid too many API calls
            setTimeout(() => {
                fetchUsageData();
            }, 1000);
        });

        return cleanup;
    }, [fetchUsageData]);

    // Also add an interval for periodic refresh (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchUsageData();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [fetchUsageData]);

    // Filter data by category if needed
    const filteredData = data
        ? {
              ...data,
              usage_by_item:
                  selectedCategory === 'all' ? data.usage_by_item : data.usage_by_item.filter((item) => item.category === selectedCategory),
              category_breakdown:
                  selectedCategory === 'all' ? data.category_breakdown : data.category_breakdown.filter((cat) => cat.category === selectedCategory),
              top_consumed_items:
                  selectedCategory === 'all' ? data.top_consumed_items : data.top_consumed_items.filter((item) => item.category === selectedCategory),
          }
        : null;

    // Recalculate summary for filtered data
    const processedData = filteredData
        ? {
              ...filteredData,
              summary: {
                  ...filteredData.summary,
                  total_consumed: filteredData.usage_by_item.reduce((sum, item) => sum + item.consumed, 0),
                  total_cost: filteredData.usage_by_item.reduce((sum, item) => sum + item.cost, 0),
                  unique_items_used: filteredData.usage_by_item.length,
                  most_used_item:
                      filteredData.usage_by_item.length > 0
                          ? filteredData.usage_by_item.reduce(
                                (max, item) => (item.consumed > max.consumed ? item : max),
                                filteredData.usage_by_item[0],
                            )
                          : null,
                  active_categories: filteredData.category_breakdown.filter((c) => c.consumed > 0).length,
              },
          }
        : null;

    return {
        data: processedData,
        loading,
        error,
        refetch: fetchUsageData,
    };
}
