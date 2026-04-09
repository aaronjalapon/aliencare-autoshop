/**
 * Customer API Service
 * Handles customer-facing API calls (billing, logs, vehicles, job orders)
 */

import { CustomerProfile, CustomerTransaction, Vehicle } from '@/types/customer';
import { api, ApiResponse, PaginatedResponse } from './api';

export interface CustomerTransactionFilters {
    type?: 'invoice' | 'payment' | 'refund';
    search?: string;
    per_page?: number;
    page?: number;
}

export interface UpdatePersonalInfoData {
    phone_number?: string;
    address?: string;
}

export interface AddVehicleData {
    make: string;
    model: string;
    year: number;
    plate_number: string;
    color?: string;
}

export interface UpdateVehicleData {
    make?: string;
    model?: string;
    year?: number;
    plate_number?: string;
    color?: string;
}

class CustomerService {
    async getMe(): Promise<ApiResponse<CustomerProfile>> {
        return api.get<ApiResponse<CustomerProfile>>('/v1/customers/me');
    }

    async updatePersonalInfo(customerId: number, data: UpdatePersonalInfoData): Promise<ApiResponse<CustomerProfile>> {
        return api.put<ApiResponse<CustomerProfile>>(`/v1/customers/${customerId}/personal-info`, data);
    }

    async addVehicle(customerId: number, data: AddVehicleData): Promise<ApiResponse<Vehicle>> {
        return api.post<ApiResponse<Vehicle>>(`/v1/customers/${customerId}/vehicles`, {
            customer_id: customerId,
            ...data,
        });
    }

    async updateVehicle(vehicleId: number, data: UpdateVehicleData): Promise<ApiResponse<Vehicle>> {
        return api.put<ApiResponse<Vehicle>>(`/v1/vehicles/${vehicleId}`, data);
    }

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
