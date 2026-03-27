/**
 * Audit Log API Service
 * Handles all audit-related API calls to Laravel backend
 */

import { api, ApiResponse, PaginatedResponse } from './api';
import { AuditLog, AuditLogFilters, AuditStats, AuditTransaction, StockTransaction } from '@/types/inventory';

class AuditService {
    // Get audit logs (archives) with pagination and filters
    async getAuditLogs(filters: AuditLogFilters = {}): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
        const params: Record<string, string | number> = {};

        if (filters.search) params.search = filters.search;
        if (filters.entity_type && filters.entity_type !== 'all') params.entity_type = filters.entity_type;
        if (filters.action) params.action = filters.action;
        if (filters.user_id) params.user_id = filters.user_id;
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<AuditLog>>>('/v1/archives', params);
    }

    // Get stock transactions for audit display
    async getAuditTransactions(filters: {
        item_id?: string;
        transaction_type?: string;
        start_date?: string;
        end_date?: string;
        per_page?: number;
        page?: number;
    } = {}): Promise<ApiResponse<PaginatedResponse<StockTransaction>>> {
        const params: Record<string, string | number> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                params[key] = String(value);
            }
        });

        return api.get<ApiResponse<PaginatedResponse<StockTransaction>>>('/v1/transactions', params);
    }

    // Get combined audit data (transactions + archives) for enhanced display
    async getCombinedAuditData(filters: AuditLogFilters = {}): Promise<{
        transactions: AuditTransaction[];
        archives: AuditLog[];
        stats: AuditStats;
    }> {
        try {
            // Fetch both transactions and archives in parallel
            const [transactionsResponse, archivesResponse] = await Promise.all([
                this.getAuditTransactions({
                    start_date: filters.start_date,
                    end_date: filters.end_date,
                    per_page: filters.per_page || 50,
                    page: filters.page || 1
                }),
                this.getAuditLogs(filters)
            ]);

            const transactions = transactionsResponse.data?.data || [];
            const archives = archivesResponse.data?.data || [];

            // Transform transactions for audit display
            const auditTransactions: AuditTransaction[] = transactions.map(transaction => ({
                ...transaction,
                performed_by: transaction.notes?.split('|')[1] || 'System',
                job_order_id: transaction.reference_number,
                reason: transaction.notes?.split('|')[0] || '',
                timestamp: transaction.created_at,
                type: this.mapTransactionType(transaction.transaction_type),
                partId: transaction.item_id,
                id: `TXN-${transaction.id}`
            }));

            // Calculate statistics
            const stats = this.calculateAuditStats(auditTransactions, archives);

            return {
                transactions: auditTransactions,
                archives,
                stats
            };
        } catch (error) {
            console.error('Error fetching combined audit data:', error);
            throw error;
        }
    }

    // Get audit statistics
    async getAuditStats(filters: Partial<AuditLogFilters> = {}): Promise<AuditStats> {
        try {
            const { stats } = await this.getCombinedAuditData(filters);
            return stats;
        } catch (error) {
            console.error('Error fetching audit stats:', error);
            throw error;
        }
    }

    // Get single audit log entry
    async getAuditLog(id: number): Promise<ApiResponse<AuditLog>> {
        return api.get<ApiResponse<AuditLog>>(`/v1/archives/${id}`);
    }

    // Get single transaction
    async getTransaction(id: number): Promise<ApiResponse<StockTransaction>> {
        return api.get<ApiResponse<StockTransaction>>(`/v1/transactions/${id}`);
    }

    // Helper method to map transaction types for display
    private mapTransactionType(type: string): string {
        const typeMap: Record<string, string> = {
            'procurement': 'RESTOCK',
            'sale': 'CONSUME',
            'return': 'RETURN',
            'damage': 'DAMAGE',
            'adjustment': 'ADJUST'
        };
        return typeMap[type] || type.toUpperCase();
    }

    // Helper method to calculate audit statistics
    private calculateAuditStats(transactions: AuditTransaction[], archives: AuditLog[]): AuditStats {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

        // Combine all activities
        const allActivities = [
            ...transactions.map(t => ({
                timestamp: new Date(t.timestamp),
                type: t.type,
                user: t.performed_by || 'System'
            })),
            ...archives.map(a => ({
                timestamp: new Date(a.archived_date),
                type: a.action.toUpperCase(),
                user: a.user_id || 'System'
            }))
        ];

        const todayActivities = allActivities.filter(a => a.timestamp >= today);
        const weekActivities = allActivities.filter(a => a.timestamp >= weekAgo);
        const monthActivities = allActivities.filter(a => a.timestamp >= monthAgo);

        // Get unique users
        const uniqueUsers = [...new Set(allActivities.map(a => a.user))];

        // Get transaction types with counts
        const typeCountMap = new Map<string, number>();
        allActivities.forEach(activity => {
            const count = typeCountMap.get(activity.type) || 0;
            typeCountMap.set(activity.type, count + 1);
        });

        const transactionTypes = Array.from(typeCountMap.entries()).map(([type, count]) => ({
            type,
            count
        }));

        return {
            total_transactions: allActivities.length,
            today_transactions: todayActivities.length,
            week_transactions: weekActivities.length,
            month_transactions: monthActivities.length,
            unique_users: uniqueUsers.length,
            transaction_types: transactionTypes,
            users: uniqueUsers.filter(user => user !== 'System')
        };
    }
}

export const auditService = new AuditService();
