export function flattenValidationErrors(validationErrors?: Record<string, string[]>): Record<string, string> {
    if (!validationErrors) {
        return {};
    }

    const flatErrors: Record<string, string> = {};
    for (const [key, messages] of Object.entries(validationErrors)) {
        const firstMessage = messages[0];
        if (firstMessage) {
            flatErrors[key] = firstMessage;
        }
    }

    return flatErrors;
}