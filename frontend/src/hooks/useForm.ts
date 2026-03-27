import { useState, useCallback } from 'react';
import { api, ApiError } from '@/services/api';
import { flattenValidationErrors } from '@/lib/validation-errors';

interface UseFormOptions {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
}

export function useForm<T extends Record<string, unknown>>(initialData: T) {
    const [data, setData] = useState<T>(initialData);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);

    const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const reset = useCallback((...fields: (keyof T)[]) => {
        if (fields.length === 0) {
            setData(initialData);
        } else {
            setData((prev) => {
                const updated = { ...prev };
                fields.forEach((field) => {
                    updated[field] = initialData[field];
                });
                return updated;
            });
        }
        setErrors({});
    }, [initialData]);

    const clearErrors = useCallback((...fields: (keyof T)[]) => {
        if (fields.length === 0) {
            setErrors({});
        } else {
            setErrors((prev) => {
                const updated = { ...prev };
                fields.forEach((field) => {
                    delete updated[field];
                });
                return updated;
            });
        }
    }, []);

    const submit = useCallback(
        async (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, options?: UseFormOptions) => {
            setProcessing(true);
            setErrors({});

            try {
                const response = method === 'get'
                    ? await api.get(url)
                    : await api[method](url, data);
                setRecentlySuccessful(true);
                setTimeout(() => setRecentlySuccessful(false), 2000);
                options?.onSuccess?.();
                return response;
            } catch (error) {
                if (error instanceof ApiError && error.status === 422) {
                    const flatErrors = flattenValidationErrors(error.validationErrors);
                    if (Object.keys(flatErrors).length > 0) {
                        const typedErrors = flatErrors as Partial<Record<keyof T, string>>;
                        setErrors(typedErrors);
                        options?.onError?.(flatErrors);
                    }
                }
                throw error;
            } finally {
                setProcessing(false);
            }
        },
        [data]
    );

    return {
        data,
        setData,
        setField,
        errors,
        setErrors,
        processing,
        recentlySuccessful,
        submit,
        reset,
        clearErrors,
    };
}
