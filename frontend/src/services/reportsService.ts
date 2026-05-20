/**
 * Reports API Service
 * Handles all reporting and analytics API calls to Laravel backend
 */

import { DashboardAnalytics, Report } from '@/types/inventory';
import { api, ApiResponse, buildQueryParams, PaginatedResponse } from './api';

export interface ReportFilters {
    report_type?: 'daily_usage' | 'monthly_procurement' | 'reconciliation' | 'low_stock' | 'reservation_summary';
    start_date?: string;
    end_date?: string;
    per_page?: number;
    page?: number;
}

export interface DailyUsageRequest {
    date: string;
}

export interface MonthlyProcurementRequest {
    year: number;
    month: number;
}

export interface ReconciliationRequest {
    start_date: string;
    end_date: string;
}

export interface UsageAnalyticsResponse {
    date_range: {
        start_date: string;
        end_date: string;
    };
    summary: {
        total_transactions: number;
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
    usage_by_item: Array<{
        item_id: number;
        item_name: string;
        part_number: string;
        description: string;
        category: string;
        consumed: number;
        cost: number;
        unit_price: number;
        transaction_count: number;
    }>;
    category_breakdown: Array<{
        category: string;
        consumed: number;
        cost: number;
        item_count: number;
    }>;
    top_consumed_items: Array<{
        item_id: number;
        item_name: string;
        part_number: string;
        description: string;
        category: string;
        consumed: number;
        cost: number;
        unit_price: number;
        transaction_count: number;
    }>;
    daily_summary: Array<{
        date: string;
        count: number;
    }>;

    // Compatibility fields for legacy consumers.
    period?: {
        start_date: string;
        end_date: string;
        days: number;
    };
    total_transactions?: number;
    by_type?: Record<string, { count: number; quantity: number }>;
    top_items?: Array<{
        item_id: number;
        item_name: string;
        part_number: string;
        description: string;
        category: string;
        consumed: number;
        cost: number;
        unit_price: number;
        transaction_count: number;
    }>;
}

export interface ProcurementAnalyticsResponse {
    date_range: {
        start_date: string;
        end_date: string;
    };
    total_procurements: number;
    total_procured: number;
    total_quantity: number;
    total_value: number;
    by_supplier: Array<{
        supplier: string;
        count: number;
        quantity: number;
        value: number;
        items_count: number;
    }>;
    by_category: Array<{
        category: string;
        count: number;
        quantity: number;
        value: number;
        item_count: number;
    }>;
    monthly_breakdown: Array<{
        month: string;
        quantity: number;
        value: number;
    }>;

    // Compatibility fields for legacy consumers.
    period?: {
        start_date: string;
        end_date: string;
    };
}

class ReportsService {
    // Get all reports with pagination and filters
    async getReports(filters: ReportFilters = {}): Promise<ApiResponse<PaginatedResponse<Report>>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
        return api.get<ApiResponse<PaginatedResponse<Report>>>('/v1/reports', params);
    }

    // Get single report
    async getReport(id: number): Promise<ApiResponse<Report>> {
        return api.get<ApiResponse<Report>>(`/v1/reports/${id}`);
    }

    // Generate daily usage report
    async generateDailyUsageReport(request: DailyUsageRequest): Promise<ApiResponse<Report>> {
        return api.post<ApiResponse<Report>>('/v1/reports/daily-usage', request);
    }

    // Generate monthly procurement report
    async generateMonthlyProcurementReport(request: MonthlyProcurementRequest): Promise<ApiResponse<Report>> {
        return api.post<ApiResponse<Report>>('/v1/reports/monthly-procurement', request);
    }

    // Generate reconciliation report
    async generateReconciliationReport(request: ReconciliationRequest): Promise<ApiResponse<Report>> {
        return api.post<ApiResponse<Report>>('/v1/reports/reconciliation', request);
    }

    // Get dashboard analytics
    async getDashboardAnalytics(startDate?: string, endDate?: string): Promise<ApiResponse<DashboardAnalytics>> {
        const params = startDate && endDate ? { start_date: startDate, end_date: endDate } : undefined;
        return api.get<ApiResponse<DashboardAnalytics>>('/v1/reports/analytics/dashboard', params);
    }

    // Get usage analytics for specific period
    async getUsageAnalytics(startDate: string, endDate: string): Promise<ApiResponse<UsageAnalyticsResponse>> {
        return api.get<ApiResponse<UsageAnalyticsResponse>>('/v1/reports/analytics/usage', { start_date: startDate, end_date: endDate });
    }

    // Get procurement analytics for specific period
    async getProcurementAnalytics(startDate: string, endDate: string): Promise<ApiResponse<ProcurementAnalyticsResponse>> {
        return api.get<ApiResponse<ProcurementAnalyticsResponse>>('/v1/reports/analytics/procurement', {
            start_date: startDate,
            end_date: endDate,
        });
    }

    // Export report to PDF/CSV
    async exportReport(reportId: number, format: 'pdf' | 'csv'): Promise<Blob> {
        const accept = format === 'pdf' ? 'application/pdf' : 'text/csv';
        return api.getBlob(`/v1/reports/${reportId}/export`, { format }, accept);
    }
}

export const reportsService = new ReportsService();
