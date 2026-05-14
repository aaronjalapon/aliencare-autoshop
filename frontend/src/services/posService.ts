import { CustomerTransaction } from '@/types/customer';
import { api, ApiResponse, buildQueryParams, PaginatedResponse } from './api';

export type PosPaymentMode = 'cash' | 'card' | 'online';

export interface PosCheckoutCartItem {
    item_id: number;
    quantity: number;
}

export interface PosCheckoutPayload {
    customer_id?: number;
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
    customer_name?: string | null;
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
        const params = buildQueryParams(filters as Record<string, unknown>);
        return api.get<ApiResponse<PaginatedResponse<CustomerTransaction>>>('/v1/pos/transactions', params);
    }
}

export const posService = new PosService();
