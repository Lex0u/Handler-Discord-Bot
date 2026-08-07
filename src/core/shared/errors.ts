// src/core/shared/errors.ts
export function serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack, name: error.name };
    }
    return { error };
}
