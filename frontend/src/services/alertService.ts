import { api, ApiResponse, PaginatedResponse } from './api';

export interface Alert {
    id: number;
    item_id: number;
    item_name: string;
    current_stock: number;
    reorder_level: number;
    category: string;
    supplier?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    alert_type: 'low_stock' | 'out_of_stock' | 'expiry' | 'reorder';
    message?: string;
    acknowledged: boolean;
    acknowledged_by?: string;
    acknowledged_at?: string;
    created_at: string;
    updated_at: string;
    inventory_item?: {
        id: number;
        item_id: number;
        item_name: string;
        category: string;
        current_stock: number;
        unit_price: string;
    };
}

export interface AlertStatistics {
    total_alerts: number;
    unacknowledged_alerts: number;
    acknowledged_alerts: number;
    critical_alerts: number;
    high_priority_alerts: number;
    alerts_by_urgency: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    alerts_by_type: Record<string, number>;
    recent_alerts: Alert[];
}

export interface AlertFilters {
    acknowledged?: boolean;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    alert_type?: 'low_stock' | 'out_of_stock' | 'expiry' | 'reorder';
    page?: number;
    per_page?: number;
}

class AlertService {
    // Get all alerts with pagination and filters
    async getAlerts(filters: AlertFilters = {}): Promise<ApiResponse<PaginatedResponse<Alert>>> {
        const params: Record<string, string | number> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params[key] = value.toString();
            }
        });

        return api.get<ApiResponse<PaginatedResponse<Alert>>>('/v1/alerts', params);
    }

    // Get alert statistics and summary
    async getAlertStatistics(): Promise<ApiResponse<AlertStatistics>> {
        return api.get<ApiResponse<AlertStatistics>>('/v1/alerts/statistics');
    }

    // Generate low stock alerts
    async generateLowStockAlerts(): Promise<
        ApiResponse<{
            alerts_created: number;
            total_low_stock_items: number;
        }>
    > {
        return api.post<
            ApiResponse<{
                alerts_created: number;
                total_low_stock_items: number;
            }>
        >('/v1/alerts/generate-low-stock');
    }

    // Acknowledge a specific alert
    async acknowledgeAlert(alertId: number): Promise<ApiResponse<Alert>> {
        return api.put<ApiResponse<Alert>>(`/v1/alerts/${alertId}/acknowledge`);
    }

    // Bulk acknowledge multiple alerts
    async bulkAcknowledgeAlerts(alertIds: number[]): Promise<
        ApiResponse<{
            acknowledged_count: number;
        }>
    > {
        return api.post<
            ApiResponse<{
                acknowledged_count: number;
            }>
        >('/v1/alerts/bulk-acknowledge', { alert_ids: alertIds });
    }

    // Cleanup old acknowledged alerts
    async cleanupAlerts(days: number = 30): Promise<
        ApiResponse<{
            deleted_count: number;
        }>
    > {
        return api.delete<
            ApiResponse<{
                deleted_count: number;
            }>
        >(`/v1/alerts/cleanup?days=${days}`);
    }

    // Get unacknowledged alerts only
    async getUnacknowledgedAlerts(): Promise<ApiResponse<PaginatedResponse<Alert>>> {
        return this.getAlerts({ acknowledged: false });
    }

    // Get acknowledged alerts only
    async getAcknowledgedAlerts(): Promise<ApiResponse<PaginatedResponse<Alert>>> {
        return this.getAlerts({ acknowledged: true });
    }

    // Get critical alerts
    async getCriticalAlerts(): Promise<ApiResponse<PaginatedResponse<Alert>>> {
        return this.getAlerts({ acknowledged: false, urgency: 'critical' });
    }

    // Get high priority alerts
    async getHighPriorityAlerts(): Promise<ApiResponse<PaginatedResponse<Alert>>> {
        return this.getAlerts({ acknowledged: false, urgency: 'high' });
    }
}

export const alertService = new AlertService();
