import { CustomerTransaction } from '@/types/customer';
import { api, ApiResponse, PaginatedResponse } from './api';

export type PosPaymentMode = 'cash' | 'online';

export interface PosCheckoutCartItem {
    item_id: number;
    quantity: number;
}

export interface PosCheckoutPayload {
    customer_id: number;
    payment_mode: PosPaymentMode;
    cart: PosCheckoutCartItem[];
    notes?: string;
}

export interface PosCheckoutLineItem {
    item_id: number;
    sku: string | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    remaining_stock: number;
}

export interface PosCheckoutSummary {
    reference_number: string;
    payment_mode: PosPaymentMode;
    item_count: number;
    subtotal: number;
    total: number;
    line_items: PosCheckoutLineItem[];
    payment_url: string | null;
}

export interface PosCheckoutResponse {
    transaction: CustomerTransaction;
    checkout: PosCheckoutSummary;
}

export interface PosTransactionFilters {
    customer_id?: number;
    payment_mode?: PosPaymentMode;
    payment_state?: 'paid' | 'pending';
    search?: string;
    per_page?: number;
    page?: number;
}

class PosService {
    async checkout(payload: PosCheckoutPayload): Promise<ApiResponse<PosCheckoutResponse>> {
        return api.post<ApiResponse<PosCheckoutResponse>>('/v1/pos/checkout', payload);
    }

    async getTransactions(filters: PosTransactionFilters = {}): Promise<ApiResponse<PaginatedResponse<CustomerTransaction>>> {
        const params: Record<string, string | number> = {};

        if (filters.customer_id) params.customer_id = filters.customer_id;
        if (filters.payment_mode) params.payment_mode = filters.payment_mode;
        if (filters.payment_state) params.payment_state = filters.payment_state;
        if (filters.search) params.search = filters.search;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<CustomerTransaction>>>('/v1/pos/transactions', params);
    }
}

export const posService = new PosService();
