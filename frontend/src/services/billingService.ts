import { BillingQueueItem } from '@/types/customer';
import { api, ApiResponse, PaginatedResponse } from './api';

export interface BillingQueueFilters {
    source?: 'all' | 'online' | 'walkin';
    status?: 'all' | 'pending' | 'partial' | 'paid';
    search?: string;
    per_page?: number;
    page?: number;
}

class BillingService {
    async getQueue(filters: BillingQueueFilters = {}): Promise<ApiResponse<PaginatedResponse<BillingQueueItem>>> {
        const params: Record<string, string | number> = {};

        if (filters.source && filters.source !== 'all') params.source = filters.source;
        if (filters.status && filters.status !== 'all') params.status = filters.status;
        if (filters.search) params.search = filters.search;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<BillingQueueItem>>>('/v1/billing/queue', params);
    }
}

export const billingService = new BillingService();
