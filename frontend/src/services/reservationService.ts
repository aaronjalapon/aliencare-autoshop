/**
 * Reservation API Service
 * Handles all reservation-related API calls to Laravel backend
 */

import { Reservation } from '@/types/inventory';
import { api, ApiResponse, buildQueryParams, PaginatedResponse } from './api';

export interface ReservationFilters {
    status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    job_order?: string;
    item_id?: string;
    per_page?: number;
    page?: number;
}

export interface NewReservation {
    item_id: number;
    quantity: number;
    job_order_number: string;
    requested_by: string;
    expires_at?: string;
    notes?: string;
}

export interface ReservationItem {
    item_id: number;
    quantity: number;
}

export interface NewMultipleReservation {
    job_order_number: string;
    requested_by: string;
    expires_at?: string;
    notes?: string;
    items: ReservationItem[];
}

export interface ReservationAction {
    approved_by?: string;
    completed_by?: string;
    cancelled_by?: string;
    actual_quantity?: number;
    reason?: string;
    notes?: string;
}

class ReservationService {
    // Get all reservations with pagination and filters
    async getReservations(filters: ReservationFilters = {}): Promise<PaginatedResponse<Reservation>> {
        const params = buildQueryParams(filters as Record<string, unknown>);
        const response = await api.get<ApiResponse<PaginatedResponse<Reservation>>>('/v1/reservations', params);
        return response.data;
    }

    // Get single reservation
    async getReservation(id: number): Promise<ApiResponse<Reservation>> {
        return api.get<ApiResponse<Reservation>>(`/v1/reservations/${id}`);
    }

    // Create new reservation
    async createReservation(reservation: NewReservation): Promise<ApiResponse<Reservation>> {
        return api.post<ApiResponse<Reservation>>('/v1/reservations/reserve', reservation);
    }

    // Create multiple reservations for a single job order
    async createMultipleReservations(reservation: NewMultipleReservation): Promise<ApiResponse<Reservation[]>> {
        return api.post<ApiResponse<Reservation[]>>('/v1/reservations/reserve-multiple', reservation);
    }

    // Approve reservation
    async approveReservation(id: number, action: ReservationAction): Promise<ApiResponse<Reservation>> {
        return api.put<ApiResponse<Reservation>>(`/v1/reservations/${id}/approve`, action);
    }

    // Reject reservation
    async rejectReservation(id: number, action: ReservationAction): Promise<ApiResponse<Reservation>> {
        return api.put<ApiResponse<Reservation>>(`/v1/reservations/${id}/reject`, action);
    }

    // Complete reservation
    async completeReservation(id: number, action: ReservationAction): Promise<ApiResponse<Reservation>> {
        return api.put<ApiResponse<Reservation>>(`/v1/reservations/${id}/complete`, action);
    }

    // Cancel reservation
    async cancelReservation(id: number, action: ReservationAction): Promise<ApiResponse<Reservation>> {
        return api.put<ApiResponse<Reservation>>(`/v1/reservations/${id}/cancel`, action);
    }

    // Get reservations by job order
    async getReservationsByJobOrder(jobOrderNumber: string): Promise<ApiResponse<Reservation[]>> {
        return api.get<ApiResponse<Reservation[]>>('/v1/reservations', {
            job_order: jobOrderNumber,
        });
    }

    // Get active reservations summary
    async getActiveReservationsSummary(): Promise<
        ApiResponse<{
            total_active: number;
            pending_approvals: number;
            expiring_soon: number;
            by_status: Record<string, number>;
        }>
    > {
        return api.get<
            ApiResponse<{
                total_active: number;
                pending_approvals: number;
                expiring_soon: number;
                by_status: Record<string, number>;
            }>
        >('/v1/reservations/summary');
    }

    // Initiate Xendit payment for a reservation fee.
    // Returns the Xendit hosted-payment URL to redirect the customer to.
    async payReservationFee(id: number): Promise<ApiResponse<{ payment_url: string }>> {
        return api.post<ApiResponse<{ payment_url: string }>>(`/v1/reservations/${id}/pay-fee`);
    }

    // Get customer's own reservations (scoped to authenticated user)
    async getMyReservations(filters: ReservationFilters = {}): Promise<PaginatedResponse<Reservation>> {
        const params = { mine: '1', ...buildQueryParams(filters as Record<string, unknown>) };
        const response = await api.get<ApiResponse<PaginatedResponse<Reservation>>>('/v1/reservations', params);
        return response.data;
    }
}

export const reservationService = new ReservationService();
