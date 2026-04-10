/**
 * Payment Service
 * Handles Xendit payment integration for customer-facing pages
 */

import { api, ApiResponse } from './api';

export interface CreateInvoiceResponse {
    payment_url: string;
}

export interface ShopCheckoutResponse {
    transaction_id: number;
    payment_url: string;
}

class PaymentService {
    /**
     * Creates a Xendit hosted invoice for a pending transaction.
     * Returns the payment URL the customer should be redirected to.
     */
    async createInvoice(transactionId: number): Promise<ApiResponse<CreateInvoiceResponse>> {
        return api.post<ApiResponse<CreateInvoiceResponse>>(`/v1/payments/${transactionId}/invoice`);
    }

    /**
     * Creates a shop order (CustomerTransaction) and a Xendit invoice in one step.
     * Returns the payment URL to redirect the customer to.
     */
    async shopCheckout(amount: number, notes?: string): Promise<ApiResponse<ShopCheckoutResponse>> {
        return api.post<ApiResponse<ShopCheckoutResponse>>('/v1/shop/checkout', { amount, notes });
    }
}

export const paymentService = new PaymentService();
