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
}

export const serviceCatalogService = new ServiceCatalogService();
