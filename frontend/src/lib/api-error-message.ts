import { ApiError } from '@/services/api';
import { flattenValidationErrors } from './validation-errors';

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        const validationErrors = flattenValidationErrors(error.validationErrors);
        const firstValidationError = Object.values(validationErrors)[0];

        if (firstValidationError) {
            return firstValidationError;
        }

        return error.message || fallback;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}
