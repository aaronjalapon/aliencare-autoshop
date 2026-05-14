/**
 * API Configuration and Base HTTP Client
 * Handles all HTTP requests to the Laravel backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
    from: number;
    to: number;
    path: string;
    links: Array<{
        url: string | null;
        label: string;
        page: number | null;
        active: boolean;
    }>;
}

export interface ApiValidationError {
    message: string;
    errors: Record<string, string[]>;
}

export interface ApiErrorResponse {
    message?: string;
    errors?: Record<string, string[]>;
    [key: string]: unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function buildQueryParams(filters: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
            params[key] = String(value);
        }
    }
    return params;
}

function toApiErrorResponse(value: unknown): ApiErrorResponse | null {
    if (!isRecord(value)) {
        return null;
    }

    const message = typeof value.message === 'string' ? value.message : undefined;
    const rawErrors = value.errors;

    let errors: Record<string, string[]> | undefined;
    if (isRecord(rawErrors)) {
        const normalizedEntries = Object.entries(rawErrors).map(([key, entry]) => {
            if (Array.isArray(entry)) {
                return [key, entry.filter((item): item is string => typeof item === 'string')] as const;
            }

            if (typeof entry === 'string') {
                return [key, [entry]] as const;
            }

            return [key, []] as const;
        });

        errors = Object.fromEntries(normalizedEntries);
    }

    return {
        ...value,
        message,
        errors,
    };
}

class ApiClient {
    private baseURL: string;
    private defaultHeaders: Record<string, string>;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
    }

    async getCsrfCookie(): Promise<void> {
        await fetch(`${this.baseURL.replace('/api', '')}/sanctum/csrf-cookie`, {
            method: 'GET',
            credentials: 'include',
        });
    }

    private getXsrfToken(): string | null {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    private async parseJsonSafely(response: Response): Promise<unknown> {
        return response.json().catch(() => null);
    }

    private async request<T>(endpoint: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const headers: Record<string, string> = {
            ...this.defaultHeaders,
            ...(options.headers as Record<string, string>),
        };

        const xsrfToken = this.getXsrfToken();
        if (xsrfToken) {
            headers['X-XSRF-TOKEN'] = xsrfToken;
        }

        const controller = new AbortController();
        const timeoutMs = options.timeout ?? 30000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const config: RequestInit = {
            ...options,
            credentials: 'include',
            headers,
            signal: controller.signal,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const rawError = await this.parseJsonSafely(response);
                const errorData = toApiErrorResponse(rawError);

                if (response.status === 422) {
                    throw new ApiError(errorData?.message || 'Validation failed', response.status, errorData || undefined);
                }

                if (response.status === 401) {
                    throw new ApiError('Unauthenticated', 401, errorData || undefined);
                }

                throw new ApiError(errorData?.message || `HTTP error! status: ${response.status}`, response.status, errorData || undefined);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new ApiError('Request timed out', 408);
            }

            throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                searchParams.append(key, String(value));
            });
            url += `?${searchParams.toString()}`;
        }
        return this.request<T>(url, { method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async patch<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'DELETE',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async getBlob(endpoint: string, params?: Record<string, string>, accept?: string): Promise<Blob> {
        let url = `${this.baseURL}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                searchParams.append(key, value);
            });
            url += `?${searchParams.toString()}`;
        }

        const headers: Record<string, string> = {
            ...this.defaultHeaders,
            ...(accept ? { Accept: accept } : {}),
        };

        const xsrfToken = this.getXsrfToken();
        if (xsrfToken) {
            headers['X-XSRF-TOKEN'] = xsrfToken;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers,
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new ApiError(`Export failed: HTTP ${response.status}`, response.status);
            }

            return response.blob();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new ApiError('Request timed out', 408);
            }

            throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

export const api = new ApiClient(API_BASE_URL);

export class ApiError<TResponse extends ApiErrorResponse = ApiErrorResponse> extends Error {
    constructor(
        message: string,
        public status?: number,
        public response?: TResponse,
    ) {
        super(message);
        this.name = 'ApiError';
    }

    get validationErrors(): Record<string, string[]> | undefined {
        return this.response?.errors;
    }
}
