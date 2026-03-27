/**
 * Reservation API Service
 * Handles all reservation-related API calls to Laravel backend
 */

import { api, ApiResponse, PaginatedResponse } from "./api";
import { Reservation } from "@/types/inventory";

export interface ReservationFilters {
  status?: "pending" | "approved" | "rejected" | "completed" | "cancelled";
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
  // Transform reservation data from API response (reservation_id -> id)
  private transformReservation(reservation: Reservation): Reservation {
    return reservation;
  }

  // Transform paginated response
  private transformPaginatedResponse(
    response: PaginatedResponse<Reservation>,
  ): PaginatedResponse<Reservation> {
    return {
      ...response,
      data: response.data.map((reservation) =>
        this.transformReservation(reservation),
      ),
    };
  }

  // Get all reservations with pagination and filters
  async getReservations(
    filters: ReservationFilters = {},
  ): Promise<PaginatedResponse<Reservation>> {
    const params: Record<string, string | number> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = String(value);
      }
    });

    const response = await api.get<ApiResponse<PaginatedResponse<Reservation>>>(
      "/v1/reservations",
      params,
    );
    return this.transformPaginatedResponse(response.data);
  }

  // Get single reservation
  async getReservation(id: number): Promise<ApiResponse<Reservation>> {
    const response = await api.get<ApiResponse<Reservation>>(`/v1/reservations/${id}`);
    return {
      ...response,
      data: this.transformReservation(response.data),
    };
  }

  // Create new reservation
  async createReservation(
    reservation: NewReservation,
  ): Promise<ApiResponse<Reservation>> {
    const response = await api.post<ApiResponse<Reservation>>(
      "/v1/reservations/reserve",
      reservation,
    );
    return {
      ...response,
      data: this.transformReservation(response.data),
    };
  }

  // Create multiple reservations for a single job order
  async createMultipleReservations(
    reservation: NewMultipleReservation,
  ): Promise<ApiResponse<Reservation[]>> {
    const response = await api.post<ApiResponse<Reservation[]>>(
      "/v1/reservations/reserve-multiple",
      reservation,
    );
    return {
      ...response,
      data: response.data.map((res: Reservation) => this.transformReservation(res)),
    };
  }

  // Approve reservation
  async approveReservation(
    id: number,
    action: ReservationAction,
  ): Promise<ApiResponse<Reservation>> {
    const response = await api.put<ApiResponse<Reservation>>(
      `/v1/reservations/${id}/approve`,
      action,
    );
    return {
      ...response,
      data: this.transformReservation(response.data),
    };
  }

  // Reject reservation
  async rejectReservation(
    id: number,
    action: ReservationAction,
  ): Promise<ApiResponse<Reservation>> {
    const response = await api.put<ApiResponse<Reservation>>(
      `/v1/reservations/${id}/reject`,
      action,
    );
    return {
      ...response,
      data: this.transformReservation(response.data),
    };
  }

  // Complete reservation
  async completeReservation(
    id: number,
    action: ReservationAction,
  ): Promise<ApiResponse<Reservation>> {
    const response = await api.put<ApiResponse<Reservation>>(
      `/v1/reservations/${id}/complete`,
      action,
    );
    return {
      ...response,
      data: this.transformReservation(response.data),
    };
  }

  // Cancel reservation
  async cancelReservation(
    id: number,
    action: ReservationAction,
  ): Promise<ApiResponse<Reservation>> {
    const response = await api.put<ApiResponse<Reservation>>(
      `/v1/reservations/${id}/cancel`,
      action,
    );
    return {
      ...response,
      data: this.transformReservation(response.data),
    };
  }

  // Get reservations by job order
  async getReservationsByJobOrder(
    jobOrderNumber: string,
  ): Promise<ApiResponse<Reservation[]>> {
    const response = await api.get<ApiResponse<Reservation[]>>("/v1/reservations", {
      job_order: jobOrderNumber,
    });
    return {
      ...response,
      data: response.data.map((res: Reservation) => this.transformReservation(res)),
    };
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
    >("/v1/reservations/summary");
  }
}

export const reservationService = new ReservationService();
