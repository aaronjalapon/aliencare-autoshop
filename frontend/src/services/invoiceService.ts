import { CustomerTransaction, InvoiceStatus } from '@/types/customer';
import { api, ApiResponse, buildQueryParams, PaginatedResponse } from './api';

export interface InvoiceFilters {
    status?: InvoiceStatus;
    search?: string;
    per_page?: number;
    page?: number;
}

export interface UpdateInvoicePayload {
    notes?: string | null;
    amount?: number;
    reference_number?: string | null;
}

class InvoiceService {
    async getInvoices(filters: InvoiceFilters = {}): Promise<ApiResponse<PaginatedResponse<CustomerTransaction>>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
        return api.get<ApiResponse<PaginatedResponse<CustomerTransaction>>>('/v1/invoices', params);
    }

    async getInvoice(id: number): Promise<ApiResponse<CustomerTransaction>> {
        return api.get<ApiResponse<CustomerTransaction>>(`/v1/invoices/${id}`);
    }

    async updateInvoice(id: number, payload: UpdateInvoicePayload): Promise<ApiResponse<CustomerTransaction>> {
        return api.put<ApiResponse<CustomerTransaction>>(`/v1/invoices/${id}`, payload);
    }

    async issueInvoice(id: number): Promise<ApiResponse<CustomerTransaction>> {
        return api.put<ApiResponse<CustomerTransaction>>(`/v1/invoices/${id}/issue`);
    }

    async voidInvoice(id: number): Promise<ApiResponse<CustomerTransaction>> {
        return api.put<ApiResponse<CustomerTransaction>>(`/v1/invoices/${id}/void`);
    }
}

export const invoiceService = new InvoiceService();
