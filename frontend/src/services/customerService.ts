/**
 * Customer API Service
 * Handles customer-facing API calls (billing, logs, vehicles, job orders)
 */

import { CustomerTransaction, Vehicle } from '@/types/customer';
import { api, ApiResponse, PaginatedResponse } from './api';

export interface CustomerTransactionFilters {
    type?: 'invoice' | 'payment' | 'refund';
    search?: string;
    per_page?: number;
    page?: number;
}

class CustomerService {
    async getTransactions(
        customerId: number,
        filters: CustomerTransactionFilters = {},
    ): Promise<ApiResponse<PaginatedResponse<CustomerTransaction>>> {
        const params: Record<string, string | number> = {};

        if (filters.type) params.type = filters.type;
        if (filters.search) params.search = filters.search;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<CustomerTransaction>>>(`/v1/customers/${customerId}/transactions`, params);
    }

    async getVehicles(customerId: number): Promise<ApiResponse<Vehicle[]>> {
        return api.get<ApiResponse<Vehicle[]>>(`/v1/customers/${customerId}/vehicles`);
    }

    async getJobOrders(customerId: number): Promise<ApiResponse<unknown[]>> {
        return api.get<ApiResponse<unknown[]>>(`/v1/customers/${customerId}/job-orders`);
    }
}

export const customerService = new CustomerService();
