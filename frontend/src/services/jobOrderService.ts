import { CustomerProfile, JobOrder, JobOrderStatus, ServiceCatalogItem, Vehicle } from '@/types/customer';
import { api, ApiResponse, PaginatedResponse } from './api';

export interface JobOrderFilters {
    status?: JobOrderStatus;
    source?: 'online_booking' | 'walk_in';
    customer_id?: number;
    mechanic_id?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
    per_page?: number;
    page?: number;
}

export interface CreateJobOrderPayload {
    customer_id: number;
    vehicle_id: number;
    notes?: string | null;
    service_fee?: number;
}

export interface UpdateJobOrderPayload {
    notes?: string | null;
    service_fee?: number;
}

export interface StartJobOrderPayload {
    mechanic_id: number;
    bay_id: number;
}

export interface SettleJobOrderPayload {
    invoice_id?: string | null;
}

export interface CustomerFilters {
    search?: string;
    account_status?: string;
    per_page?: number;
    page?: number;
}

export interface CreateCustomerPayload {
    first_name: string;
    last_name: string;
    phone_number: string;
    email?: string | null;
    license_number?: string | null;
}

export interface CreateVehicleForCustomerPayload {
    make: string;
    model: string;
    year: number;
    plate_number: string;
    color?: string;
}

export interface MechanicOption {
    id: number;
    user_id: number;
    name: string | null;
    specialization: string | null;
    availability_status: string;
}

export interface BayOption {
    id: number;
    name: string;
    status: string;
}

export interface ServiceCatalogFilters {
    category?: string;
    search?: string;
    per_page?: number;
    page?: number;
}

class FrontdeskJobOrderService {
    async getJobOrders(filters: JobOrderFilters = {}): Promise<ApiResponse<PaginatedResponse<JobOrder>>> {
        const params: Record<string, string | number> = {};

        if (filters.status) params.status = filters.status;
        if (filters.source) params.source = filters.source;
        if (filters.customer_id) params.customer_id = filters.customer_id;
        if (filters.mechanic_id) params.mechanic_id = filters.mechanic_id;
        if (filters.search) params.search = filters.search;
        if (filters.date_from) params.date_from = filters.date_from;
        if (filters.date_to) params.date_to = filters.date_to;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<JobOrder>>>('/v1/job-orders', params);
    }

    async getJobOrder(id: number): Promise<ApiResponse<JobOrder>> {
        return api.get<ApiResponse<JobOrder>>(`/v1/job-orders/${id}`);
    }

    async createJobOrder(payload: CreateJobOrderPayload): Promise<ApiResponse<JobOrder>> {
        return api.post<ApiResponse<JobOrder>>('/v1/job-orders', payload);
    }

    async updateJobOrder(id: number, payload: UpdateJobOrderPayload): Promise<ApiResponse<JobOrder>> {
        return api.put<ApiResponse<JobOrder>>(`/v1/job-orders/${id}`, payload);
    }

    async submitJobOrder(id: number): Promise<ApiResponse<JobOrder>> {
        return api.put<ApiResponse<JobOrder>>(`/v1/job-orders/${id}/submit`);
    }

    async approveJobOrder(id: number): Promise<ApiResponse<JobOrder>> {
        return api.put<ApiResponse<JobOrder>>(`/v1/job-orders/${id}/approve`);
    }

    async startJobOrder(id: number, payload: StartJobOrderPayload): Promise<ApiResponse<JobOrder>> {
        return api.put<ApiResponse<JobOrder>>(`/v1/job-orders/${id}/start`, payload);
    }

    async completeJobOrder(id: number): Promise<ApiResponse<JobOrder>> {
        return api.put<ApiResponse<JobOrder>>(`/v1/job-orders/${id}/complete`);
    }

    async settleJobOrder(id: number, payload: SettleJobOrderPayload): Promise<ApiResponse<JobOrder>> {
        return api.put<ApiResponse<JobOrder>>(`/v1/job-orders/${id}/settle`, payload);
    }

    async cancelJobOrder(id: number): Promise<ApiResponse<JobOrder>> {
        return api.delete<ApiResponse<JobOrder>>(`/v1/job-orders/${id}/cancel`);
    }

    async getCustomers(filters: CustomerFilters = {}): Promise<ApiResponse<PaginatedResponse<CustomerProfile>>> {
        const params: Record<string, string | number> = {};

        if (filters.search) params.search = filters.search;
        if (filters.account_status) params.account_status = filters.account_status;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<CustomerProfile>>>('/v1/customers', params);
    }

    async createCustomer(payload: CreateCustomerPayload): Promise<ApiResponse<CustomerProfile>> {
        return api.post<ApiResponse<CustomerProfile>>('/v1/customers', payload);
    }

    async getVehiclesForCustomer(customerId: number): Promise<ApiResponse<Vehicle[]>> {
        return api.get<ApiResponse<Vehicle[]>>(`/v1/customers/${customerId}/vehicles`);
    }

    async createVehicleForCustomer(customerId: number, payload: CreateVehicleForCustomerPayload): Promise<ApiResponse<Vehicle>> {
        return api.post<ApiResponse<Vehicle>>(`/v1/customers/${customerId}/vehicles`, {
            customer_id: customerId,
            ...payload,
        });
    }

    async getMechanics(availabilityStatus?: string): Promise<ApiResponse<MechanicOption[]>> {
        const params: Record<string, string> = {};
        if (availabilityStatus) {
            params.availability_status = availabilityStatus;
        }

        return api.get<ApiResponse<MechanicOption[]>>('/v1/mechanics', Object.keys(params).length > 0 ? params : undefined);
    }

    async getBays(status?: string): Promise<ApiResponse<BayOption[]>> {
        const params: Record<string, string> = {};
        if (status) {
            params.status = status;
        }

        return api.get<ApiResponse<BayOption[]>>('/v1/bays', Object.keys(params).length > 0 ? params : undefined);
    }

    async getServices(filters: ServiceCatalogFilters = {}): Promise<ApiResponse<PaginatedResponse<ServiceCatalogItem>>> {
        const params: Record<string, string | number> = {};

        if (filters.category) params.category = filters.category;
        if (filters.search) params.search = filters.search;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<ServiceCatalogItem>>>('/v1/services', params);
    }
}

export const frontdeskJobOrderService = new FrontdeskJobOrderService();
