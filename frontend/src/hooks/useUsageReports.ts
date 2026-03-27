import { useCallback, useEffect, useState } from 'react';
import { reportsService } from '../services/reportsService';
import { inventoryEvents } from '../utils/inventoryEvents';

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

      const response = await reportsService.getUsageAnalytics(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (response.success) {
        setData(response.data);
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
    const cleanup = inventoryEvents.listenMultiple(
      ['inventory-updated', 'stock-transaction', 'reservation-updated'],
      () => {
        // Debounce the refresh to avoid too many API calls
        setTimeout(() => {
          fetchUsageData();
        }, 1000);
      }
    );

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
  const filteredData = data ? {
    ...data,
    usage_by_item: selectedCategory === 'all'
      ? data.usage_by_item
      : data.usage_by_item.filter(item => item.category === selectedCategory),
    category_breakdown: selectedCategory === 'all'
      ? data.category_breakdown
      : data.category_breakdown.filter(cat => cat.category === selectedCategory),
    top_consumed_items: selectedCategory === 'all'
      ? data.top_consumed_items
      : data.top_consumed_items.filter(item => item.category === selectedCategory)
  } : null;

  // Recalculate summary for filtered data
  const processedData = filteredData ? {
    ...filteredData,
    summary: {
      ...filteredData.summary,
      total_consumed: filteredData.usage_by_item.reduce((sum, item) => sum + item.consumed, 0),
      total_cost: filteredData.usage_by_item.reduce((sum, item) => sum + item.cost, 0),
      unique_items_used: filteredData.usage_by_item.length,
      most_used_item: filteredData.usage_by_item.length > 0
        ? filteredData.usage_by_item.reduce((max, item) =>
            item.consumed > max.consumed ? item : max, filteredData.usage_by_item[0]
          )
        : null,
      active_categories: filteredData.category_breakdown.filter(c => c.consumed > 0).length
    }
  } : null;

  return {
    data: processedData,
    loading,
    error,
    refetch: fetchUsageData
  };
}
