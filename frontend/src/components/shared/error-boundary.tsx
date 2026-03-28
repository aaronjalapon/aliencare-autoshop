import { Component, ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = {
    children: ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Unhandled application error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center p-6">
                    <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                        <h1 className="text-xl font-semibold">Something went wrong</h1>
                        <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred. Please refresh the page and try again.</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
