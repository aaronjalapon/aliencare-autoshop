import { CustomerProfile, CustomerTransaction, JobOrder, JobOrderItem, JobOrderStatus, ServiceCatalogItem, Vehicle } from '@/types/customer';
import { api, ApiResponse, buildQueryParams, PaginatedResponse } from './api';

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
    arrival_date: string;
    arrival_time: string;
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

export interface AddJobOrderItemPayload {
    item_type: 'part' | 'service';
    item_id?: number | null;
    description: string;
    quantity: number;
    unit_price: number;
}

export interface UpdateJobOrderItemPayload {
    description?: string;
    quantity?: number;
    unit_price?: number;
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
    has_time_conflict?: boolean;
    service_match_score?: number;
}

export interface BayOption {
    id: number;
    name: string;
    status: string;
    has_time_conflict?: boolean;
}

export interface MechanicFilters {
    availability_status?: string;
    arrival_date?: string;
    arrival_time?: string;
    service_id?: number;
    exclude_job_order_id?: number;
}

export interface BayFilters {
    status?: string;
    arrival_date?: string;
    arrival_time?: string;
    exclude_job_order_id?: number;
}

export interface ServiceCatalogFilters {
    category?: string;
    search?: string;
    per_page?: number;
    page?: number;
}

class JobOrderService {
    async getJobOrders(filters: JobOrderFilters = {}): Promise<ApiResponse<PaginatedResponse<JobOrder>>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
        return api.get<ApiResponse<PaginatedResponse<JobOrder>>>('/v1/job-orders', params);
    }

    async getSlotAvailability(arrivalDate: string): Promise<ApiResponse<{ arrival_date: string; slots: Array<{ time: string; label: string; status: string; slots_left: number; capacity: number; booked: number }> }>> {
        return api.get('/v1/job-orders/slot-availability', { arrival_date: arrivalDate });
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

    async prepareInvoice(jobOrderId: number, notes?: string): Promise<ApiResponse<CustomerTransaction>> {
        return api.post<ApiResponse<CustomerTransaction>>(`/v1/job-orders/${jobOrderId}/prepare-invoice`, { notes });
    }

    async getCustomers(filters: CustomerFilters = {}): Promise<ApiResponse<PaginatedResponse<CustomerProfile>>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
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

    async getMechanics(filters: MechanicFilters = {}): Promise<ApiResponse<MechanicOption[]>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
        return api.get<ApiResponse<MechanicOption[]>>('/v1/mechanics', Object.keys(params).length > 0 ? params : undefined);
    }

    async getBays(filters: BayFilters = {}): Promise<ApiResponse<BayOption[]>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
        return api.get<ApiResponse<BayOption[]>>('/v1/bays', Object.keys(params).length > 0 ? params : undefined);
    }

    async getServices(filters: ServiceCatalogFilters = {}): Promise<ApiResponse<PaginatedResponse<ServiceCatalogItem>>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
        return api.get<ApiResponse<PaginatedResponse<ServiceCatalogItem>>>('/v1/services', params);
    }

    async addItemToJobOrder(jobOrderId: number, payload: AddJobOrderItemPayload): Promise<ApiResponse<JobOrderItem>> {
        return api.post<ApiResponse<JobOrderItem>>(`/v1/job-orders/${jobOrderId}/items`, payload);
    }

    async updateJobOrderItem(jobOrderId: number, itemId: number, payload: UpdateJobOrderItemPayload): Promise<ApiResponse<JobOrderItem>> {
        return api.put<ApiResponse<JobOrderItem>>(`/v1/job-orders/${jobOrderId}/items/${itemId}`, payload);
    }

    async removeJobOrderItem(jobOrderId: number, itemId: number): Promise<ApiResponse<null>> {
        return api.delete<ApiResponse<null>>(`/v1/job-orders/${jobOrderId}/items/${itemId}`);
    }
}

export const jobOrderService = new JobOrderService();
