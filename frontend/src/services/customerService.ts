/**
 * Customer API Service
 * Handles customer-facing API calls (billing, logs, vehicles, job orders)
 */

import {
    BookingAvailability,
    CustomerBillingReceipt,
    CustomerBillingSummary,
    CustomerProfile,
    CustomerTransaction,
    JobOrder,
    JobOrderReceiptUrl,
    Vehicle,
} from '@/types/customer';
import { api, ApiResponse, PaginatedResponse } from './api';

export interface CustomerTransactionFilters {
    type?: 'invoice' | 'payment' | 'refund' | 'reservation_fee';
    payment_state?: 'paid' | 'pending';
    search?: string;
    from_date?: string;
    to_date?: string;
    payment_method?: string;
    per_page?: number;
    page?: number;
}

export interface CreateCustomerTransactionData {
    type: 'invoice' | 'payment' | 'refund' | 'reservation_fee';
    amount: number;
    job_order_id?: number | null;
    reference_number?: string | null;
    notes?: string | null;
}

export interface UpdateCustomerTransactionData {
    type?: 'invoice' | 'payment' | 'refund' | 'reservation_fee';
    amount?: number;
    reference_number?: string | null;
    notes?: string | null;
}

export interface CustomerBillingReceiptFilters {
    search?: string;
    from_date?: string;
    to_date?: string;
    payment_method?: string;
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

export interface UpdateSpecialInfoData {
    preferred_contact_method?: 'sms' | 'call' | 'email';
    special_notes?: string | null;
}

export interface OnboardingVehicleData {
    make: string;
    model: string;
    year: number;
    plate_number: string;
    color?: string;
    vin?: string;
}

export interface CompleteOnboardingData {
    first_name: string;
    last_name: string;
    phone_number: string;
    address?: string;
    license_number?: string;
    preferred_contact_method: 'sms' | 'call' | 'email';
    special_notes?: string;
    vehicles: OnboardingVehicleData[];
}

export interface CustomerOnboardingStatus {
    has_customer_profile: boolean;
    onboarding_completed: boolean;
    customer: CustomerProfile | null;
}

export interface CreateBookingData {
    vehicle_id: number;
    service_id: number;
    arrival_date: string; // Y-m-d
    arrival_time: string; // HH:MM
    notes?: string;
}

export type BookingPayMethod = 'gcash' | 'maya' | 'card' | 'bank';

export interface CreateBookingWithPaymentData extends CreateBookingData {
    payment_method: BookingPayMethod;
}

export interface CreateBookingWithPaymentResponse {
    job_order: JobOrder;
    transaction_id: number;
    reservation_fee_amount: number;
    payment_url: string;
    payment_method: BookingPayMethod;
}

export interface RescheduleMyJobOrderData {
    arrival_date: string;
    arrival_time: string;
}

class CustomerService {
    async getOnboardingStatus(): Promise<ApiResponse<CustomerOnboardingStatus>> {
        return api.get<ApiResponse<CustomerOnboardingStatus>>('/v1/customer/onboarding-status');
    }

    async completeOnboarding(data: CompleteOnboardingData): Promise<ApiResponse<CustomerProfile>> {
        return api.post<ApiResponse<CustomerProfile>>('/v1/customer/onboarding', data);
    }

    async getMe(): Promise<ApiResponse<CustomerProfile>> {
        return api.get<ApiResponse<CustomerProfile>>('/v1/customers/me');
    }

    async updatePersonalInfo(customerId: number, data: UpdatePersonalInfoData): Promise<ApiResponse<CustomerProfile>> {
        return api.put<ApiResponse<CustomerProfile>>(`/v1/customers/${customerId}/personal-info`, data);
    }

    async updateSpecialInfo(customerId: number, data: UpdateSpecialInfoData): Promise<ApiResponse<CustomerProfile>> {
        return api.put<ApiResponse<CustomerProfile>>(`/v1/customers/${customerId}/special-info`, data);
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
        if (filters.payment_state) params.payment_state = filters.payment_state;
        if (filters.search) params.search = filters.search;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.payment_method) params.payment_method = filters.payment_method;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<CustomerTransaction>>>(`/v1/customers/${customerId}/transactions`, params);
    }

    async getMyTransactions(filters: CustomerTransactionFilters = {}): Promise<ApiResponse<PaginatedResponse<CustomerTransaction>>> {
        const params: Record<string, string | number> = {};

        if (filters.type) params.type = filters.type;
        if (filters.payment_state) params.payment_state = filters.payment_state;
        if (filters.search) params.search = filters.search;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.payment_method) params.payment_method = filters.payment_method;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<CustomerTransaction>>>('/v1/customer/transactions', params);
    }

    async createCustomerTransaction(customerId: number, data: CreateCustomerTransactionData): Promise<ApiResponse<CustomerTransaction>> {
        return api.post<ApiResponse<CustomerTransaction>>(`/v1/customers/${customerId}/transactions`, data);
    }

    async updateCustomerTransaction(
        customerId: number,
        transactionId: number,
        data: UpdateCustomerTransactionData,
    ): Promise<ApiResponse<CustomerTransaction>> {
        return api.patch<ApiResponse<CustomerTransaction>>(`/v1/customers/${customerId}/transactions/${transactionId}`, data);
    }

    async getMyBillingSummary(): Promise<ApiResponse<CustomerBillingSummary>> {
        return api.get<ApiResponse<CustomerBillingSummary>>('/v1/customer/billing/summary');
    }

    async getMyBillingReceipts(
        filters: CustomerBillingReceiptFilters = {},
    ): Promise<ApiResponse<PaginatedResponse<CustomerBillingReceipt>>> {
        const params: Record<string, string | number> = {};

        if (filters.search) params.search = filters.search;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.payment_method) params.payment_method = filters.payment_method;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.page) params.page = filters.page;

        return api.get<ApiResponse<PaginatedResponse<CustomerBillingReceipt>>>('/v1/customer/billing/receipts', params);
    }

    async getMyBillingReceiptDetail(transactionId: number): Promise<ApiResponse<CustomerBillingReceipt>> {
        return api.get<ApiResponse<CustomerBillingReceipt>>(`/v1/customer/billing/receipts/${transactionId}`);
    }

    async getVehicles(customerId: number): Promise<ApiResponse<Vehicle[]>> {
        return api.get<ApiResponse<Vehicle[]>>(`/v1/customers/${customerId}/vehicles`);
    }

    async getJobOrders(customerId: number): Promise<ApiResponse<JobOrder[]>> {
        return api.get<ApiResponse<JobOrder[]>>(`/v1/customers/${customerId}/job-orders`);
    }

    async getMyJobOrders(): Promise<ApiResponse<JobOrder[]>> {
        return api.get<ApiResponse<JobOrder[]>>('/v1/customer/job-orders');
    }

    async rescheduleMyJobOrder(id: number, data: RescheduleMyJobOrderData): Promise<ApiResponse<JobOrder>> {
        return api.patch<ApiResponse<JobOrder>>(`/v1/customer/job-orders/${id}/reschedule`, data);
    }

    async cancelMyJobOrder(id: number): Promise<ApiResponse<JobOrder>> {
        return api.delete<ApiResponse<JobOrder>>(`/v1/customer/job-orders/${id}/cancel`);
    }

    async getMyJobOrderReceiptUrl(id: number): Promise<ApiResponse<JobOrderReceiptUrl>> {
        return api.get<ApiResponse<JobOrderReceiptUrl>>(`/v1/customer/job-orders/${id}/receipt-url`);
    }

    async createBooking(data: CreateBookingData): Promise<ApiResponse<JobOrder>> {
        return api.post<ApiResponse<JobOrder>>('/v1/customer/book', data);
    }

    async createBookingWithPayment(data: CreateBookingWithPaymentData): Promise<ApiResponse<CreateBookingWithPaymentResponse>> {
        return api.post<ApiResponse<CreateBookingWithPaymentResponse>>('/v1/customer/book-with-payment', data);
    }

    async getBookingAvailability(arrivalDate: string): Promise<ApiResponse<BookingAvailability>> {
        return api.get<ApiResponse<BookingAvailability>>('/v1/customer/availability', {
            arrival_date: arrivalDate,
        });
    }
}

export const customerService = new CustomerService();
