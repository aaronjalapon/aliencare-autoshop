/**
 * Service Catalog API Service
 * Handles service catalog API calls (public endpoints)
 */

import { ServiceCatalogItem } from '@/types/customer';
import { api, ApiResponse, PaginatedResponse } from './api';

export interface ServiceCatalogFilters {
    category?: string;
    search?: string;
    per_page?: number;
    page?: number;
}

export interface ServiceCatalogManagementFilters extends ServiceCatalogFilters {
    is_active?: boolean;
}

export interface ServiceCatalogMutationPayload {
    name: string;
    description: string | null;
    price_label: string;
    price_fixed: number;
    duration: string;
    estimated_duration: string;
    category: 'maintenance' | 'cleaning' | 'repair';
    features: string[];
    includes: string[];
    rating: number;
    rating_count: number;
    queue_label: string | null;
    recommended: boolean;
    recommended_note: string | null;
    is_active: boolean;
}

class ServiceCatalogService {
    async getServices(filters: ServiceCatalogFilters = {}): Promise<ApiResponse<PaginatedResponse<ServiceCatalogItem>>> {
        const params: Record<string, string | number> = {};

        if (filters.category) params.category = filters.category;
        if (filters.search) params.search = filters.search;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<ServiceCatalogItem>>>('/v1/services', params);
    }

    async getService(id: number): Promise<ApiResponse<ServiceCatalogItem>> {
        return api.get<ApiResponse<ServiceCatalogItem>>(`/v1/services/${id}`);
    }

    async getManageServices(filters: ServiceCatalogManagementFilters = {}): Promise<ApiResponse<PaginatedResponse<ServiceCatalogItem>>> {
        const params: Record<string, string | number> = {};

        if (filters.category) params.category = filters.category;
        if (filters.search) params.search = filters.search;
        if (filters.is_active !== undefined) params.is_active = filters.is_active ? 1 : 0;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<ServiceCatalogItem>>>('/v1/services/manage', params);
    }

    async createService(payload: ServiceCatalogMutationPayload): Promise<ApiResponse<ServiceCatalogItem>> {
        return api.post<ApiResponse<ServiceCatalogItem>>('/v1/services', payload);
    }

    async updateService(id: number, payload: Partial<ServiceCatalogMutationPayload>): Promise<ApiResponse<ServiceCatalogItem>> {
        return api.put<ApiResponse<ServiceCatalogItem>>(`/v1/services/${id}`, payload);
    }

    async deactivateService(id: number): Promise<ApiResponse<ServiceCatalogItem>> {
        return api.delete<ApiResponse<ServiceCatalogItem>>(`/v1/services/${id}`);
    }
}

export const serviceCatalogService = new ServiceCatalogService();
