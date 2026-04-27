/**
 * Inventory API Service
 * Handles all inventory-related API calls to Laravel backend
 */

import { DashboardAnalytics, InventoryItem, StockTransaction } from '@/types/inventory';
import { normalizeStockTransaction, normalizeStockTransactions } from './inventoryWorkspaceNormalizers';
import { api, ApiResponse, PaginatedResponse } from './api';

type LowStockAlertsPayload = InventoryItem[] | { alert_count?: number; alerts?: InventoryItem[]; data?: InventoryItem[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isInventoryItem(value: unknown): value is InventoryItem {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === 'number' &&
        typeof value.item_id === 'number' &&
        typeof value.item_name === 'string' &&
        typeof value.stock === 'number' &&
        typeof value.reorder_level === 'number'
    );
}

function normalizeInventoryItems(value: unknown): InventoryItem[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isInventoryItem);
}

function normalizeLowStockAlertsData(payload: unknown): InventoryItem[] {
    if (Array.isArray(payload)) {
        return normalizeInventoryItems(payload);
    }

    if (!isRecord(payload)) {
        return [];
    }

    if (Array.isArray(payload.alerts)) {
        return normalizeInventoryItems(payload.alerts);
    }

    if (Array.isArray(payload.data)) {
        return normalizeInventoryItems(payload.data);
    }

    return [];
}

export interface ArchiveEntry {
    id: number;
    entity_type: string;
    entity_id: string;
    action: string;
    user_id?: number;
    created_at: string;
    updated_at: string;
}

export interface InventoryFilters {
    search?: string;
    category?: string;
    low_stock?: boolean;
    per_page?: number;
    page?: number;
}

export interface StockOperation {
    item_id: number;
    quantity: number;
    reference_number?: string;
    notes?: string;
}

export interface ReturnDamageOperation extends StockOperation {
    transaction_type: 'return' | 'damage';
}

export interface StockMutationPayload {
    inventory: InventoryItem;
    transaction: StockTransaction | null;
    previous_stock: number;
    new_stock: number;
}

export interface NewInventoryItem {
    sku?: string;
    item_id?: number; // Optional since it's auto-generated
    item_name: string;
    description: string | null;
    category: string;
    stock: number;
    reorder_level: number;
    unit_price: number;
    supplier: string | null;
    location: string | null;
    status?: 'active' | 'inactive' | 'discontinued';
}

class InventoryService {
    // Get all inventory items with pagination and filters
    async getInventoryItems(filters: InventoryFilters = {}): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> {
        const params: Record<string, string | number> = {};

        if (filters.search) params.search = filters.search;
        if (filters.category) params.category = filters.category;
        if (filters.low_stock) params.low_stock = 'true';
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<InventoryItem>>>('/v1/inventory', params);
    }

    // Get single inventory item
    async getInventoryItem(itemId: string): Promise<ApiResponse<InventoryItem>> {
        return api.get<ApiResponse<InventoryItem>>(`/v1/inventory/${itemId}`);
    }

    // Create new inventory item
    async createInventoryItem(item: NewInventoryItem): Promise<ApiResponse<InventoryItem>> {
        return api.post<ApiResponse<InventoryItem>>('/v1/inventory', item);
    }

    // Update inventory item
    async updateInventoryItem(itemId: number, item: Partial<NewInventoryItem>): Promise<ApiResponse<InventoryItem>> {
        return api.put<ApiResponse<InventoryItem>>(`/v1/inventory/${itemId}`, item);
    }

    // Delete inventory item
    async deleteInventoryItem(itemId: number | string): Promise<ApiResponse<{ message: string }>> {
        return api.delete<ApiResponse<{ message: string }>>(`/v1/inventory/${itemId}`);
    }

    // Check stock status for quantity
    async checkStockStatus(itemId: string, quantity: number): Promise<ApiResponse<{ available: boolean; current_stock: number }>> {
        return api.get<ApiResponse<{ available: boolean; current_stock: number }>>(`/v1/inventory/${itemId}/stock-status`, {
            requested_quantity: quantity.toString(),
        });
    }

    // Add stock (procurement)
    async addStock(operation: StockOperation): Promise<ApiResponse<StockMutationPayload>> {
        const response = await api.post<ApiResponse<StockMutationPayload>>('/v1/inventory/add-stock', operation);

        return {
            ...response,
            data: {
                ...response.data,
                transaction: normalizeStockTransaction(response.data?.transaction),
            },
        };
    }

    // Deduct stock (sales)
    async deductStock(operation: StockOperation): Promise<ApiResponse<StockMutationPayload>> {
        const response = await api.post<ApiResponse<StockMutationPayload>>('/v1/inventory/deduct-stock', operation);

        return {
            ...response,
            data: {
                ...response.data,
                transaction: normalizeStockTransaction(response.data?.transaction),
            },
        };
    }

    // Log return/damage
    async logReturnDamage(operation: ReturnDamageOperation): Promise<ApiResponse<StockMutationPayload>> {
        const response = await api.post<ApiResponse<StockMutationPayload>>('/v1/inventory/log-return-damage', operation);

        return {
            ...response,
            data: {
                ...response.data,
                transaction: normalizeStockTransaction(response.data?.transaction),
            },
        };
    }

    // Get low stock alerts
    async getLowStockAlerts(): Promise<ApiResponse<InventoryItem[]>> {
        const response = await api.get<ApiResponse<LowStockAlertsPayload>>('/v1/inventory/alerts/low-stock');
        const normalizedAlerts = normalizeLowStockAlertsData(response.data);

        return {
            ...response,
            data: normalizedAlerts,
        };
    }

    // Get dashboard analytics
    async getDashboardAnalytics(): Promise<ApiResponse<DashboardAnalytics>> {
        return api.get<ApiResponse<DashboardAnalytics>>('/v1/reports/analytics/dashboard');
    }

    // Get stock transactions with filters
    async getStockTransactions(
        filters: {
            item_id?: string;
            transaction_type?: string;
            start_date?: string;
            end_date?: string;
            per_page?: number;
            page?: number;
        } = {},
    ): Promise<ApiResponse<PaginatedResponse<StockTransaction>>> {
        const params: Record<string, string | number> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                params[key] = String(value);
            }
        });

        const response = await api.get<ApiResponse<PaginatedResponse<StockTransaction>>>('/v1/transactions', params);

        return {
            ...response,
            data: {
                ...response.data,
                data: normalizeStockTransactions(response.data?.data),
            },
        };
    }

    // Get archives/audit logs with filters
    async getArchives(
        filters: {
            entity_type?: string;
            entity_id?: string;
            action?: string;
            start_date?: string;
            end_date?: string;
            per_page?: number;
            page?: number;
        } = {},
    ): Promise<ApiResponse<PaginatedResponse<ArchiveEntry>>> {
        const params: Record<string, string | number> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                params[key] = String(value);
            }
        });

        return api.get<ApiResponse<PaginatedResponse<ArchiveEntry>>>('/v1/archives', params);
    }
}

export const inventoryService = new InventoryService();
