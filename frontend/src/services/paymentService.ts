/**
 * Payment Service
 * Handles Xendit payment integration for customer-facing pages
 */

import { api, ApiResponse } from './api';

export interface CreateInvoiceResponse {
    payment_url: string;
}

export interface PayAllResponse {
    payment_url: string;
    transaction_count: number;
    total_amount: number;
}

export interface ShopCheckoutResponse {
    transaction_id: number;
    payment_url: string;
}

export interface ShopPayAtShopResponse {
    transaction_id: number;
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
     * Creates a single Xendit invoice covering all pending transactions
     * for the authenticated customer, allowing the total balance to be paid at once.
     */
    async payAll(): Promise<ApiResponse<PayAllResponse>> {
        return api.post<ApiResponse<PayAllResponse>>('/v1/payments/pay-all');
    }

    /**
     * Syncs pending transaction statuses with the Xendit API.
     * Call after a Xendit payment redirect to ensure the latest status is reflected.
     */
    async syncPayments(): Promise<ApiResponse<{ updated_count: number }>> {
        return api.post<ApiResponse<{ updated_count: number }>>('/v1/payments/sync');
    }

    /**
     * Creates a shop order (CustomerTransaction) and a Xendit invoice in one step.
     * Returns the payment URL to redirect the customer to.
     */
    async shopCheckout(amount: number, notes?: string): Promise<ApiResponse<ShopCheckoutResponse>> {
        return api.post<ApiResponse<ShopCheckoutResponse>>('/v1/shop/checkout', { amount, notes });
    }

    /**
     * Creates a shop order as a pending invoice (pay at shop / cash).
     * No Xendit payment — the full amount shows as pending in Billing & Payment.
     */
    async shopPayAtShop(amount: number, notes?: string): Promise<ApiResponse<ShopPayAtShopResponse>> {
        return api.post<ApiResponse<ShopPayAtShopResponse>>('/v1/shop/pay-at-shop', { amount, notes });
    }
}

export const paymentService = new PaymentService();
