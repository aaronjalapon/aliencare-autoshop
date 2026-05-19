import App from '@/App';
import ErrorBoundary from '@/components/shared/error-boundary';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/context/AuthContext';
import { initializeTheme } from '@/hooks/use-appearance';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './app.css';

const root = document.getElementById('root');

if (root) {
    createRoot(root).render(
        <StrictMode>
            <ErrorBoundary>
                <BrowserRouter>
                    <AuthProvider>
                        <ToastProvider>
                            <App />
                        </ToastProvider>
                    </AuthProvider>
                </BrowserRouter>
            </ErrorBoundary>
        </StrictMode>,
    );
}

initializeTheme();
