import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
    title?: string;
    message: string;
    variant?: ToastVariant;
    duration?: number;
}

interface ToastState extends ToastOptions {
    id: string;
    state: 'open' | 'closed';
}

interface ToastContextValue {
    toast: (options: ToastOptions) => string;
    success: (message: string, title?: string) => string;
    error: (message: string, title?: string) => string;
    info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4500;
const EXIT_ANIMATION_MS = 240;

const createId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastState[]>([]);

    const closeToast = useCallback((id: string) => {
        setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, state: 'closed' } : toast)));
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, EXIT_ANIMATION_MS);
    }, []);

    const pushToast = useCallback(
        (options: ToastOptions): string => {
            const id = createId();
            const duration = options.duration ?? DEFAULT_DURATION;
            const nextToast: ToastState = {
                id,
                state: 'closed',
                variant: options.variant ?? 'info',
                title: options.title,
                message: options.message,
                duration,
            };

            setToasts((prev) => [nextToast, ...prev]);

            requestAnimationFrame(() => {
                setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, state: 'open' } : toast)));
            });

            if (duration > 0) {
                window.setTimeout(() => {
                    closeToast(id);
                }, duration);
            }

            return id;
        },
        [closeToast],
    );

    const value = useMemo<ToastContextValue>(
        () => ({
            toast: pushToast,
            success: (message, title = 'Success') => pushToast({ message, title, variant: 'success' }),
            error: (message, title = 'Something went wrong') => pushToast({ message, title, variant: 'error' }),
            info: (message, title = 'Notice') => pushToast({ message, title, variant: 'info' }),
        }),
        [pushToast],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onClose={closeToast} />
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

function ToastViewport({
    toasts,
    onClose,
}: {
    toasts: ToastState[];
    onClose: (id: string) => void;
}) {
    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed top-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }: { toast: ToastState; onClose: (id: string) => void }) {
    const variant = toast.variant ?? 'info';
    const isError = variant === 'error';
    const isSuccess = variant === 'success';

    const iconClass = isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-[#d4af37]';
    const borderClass = isSuccess ? 'border-emerald-500/30' : isError ? 'border-rose-500/30' : 'border-[#d4af37]/35';
    const bgClass = isSuccess ? 'bg-emerald-500/10' : isError ? 'bg-rose-500/10' : 'bg-[#d4af37]/10';

    const Icon = isSuccess ? CheckCircle2 : isError ? XCircle : Info;
    const motionClass = toast.state === 'open' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2';

    return (
        <div
            data-state={toast.state}
            role="status"
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto w-full rounded-lg border ${borderClass} ${bgClass} ${motionClass} px-4 py-3 shadow-lg backdrop-blur transition duration-200 ease-out`}
        >
            <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 ${iconClass}`} />
                <div className="flex-1">
                    {toast.title && <p className="text-sm font-semibold text-foreground">{toast.title}</p>}
                    <p className="text-xs text-muted-foreground">{toast.message}</p>
                </div>
                <button
                    onClick={() => onClose(toast.id)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Dismiss notification"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
