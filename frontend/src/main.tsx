import './app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import App from '@/App';
import ErrorBoundary from '@/components/shared/error-boundary';
import { initializeTheme } from '@/hooks/use-appearance';

const root = document.getElementById('root');

if (root) {
    createRoot(root).render(
        <StrictMode>
            <ErrorBoundary>
                <BrowserRouter>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </BrowserRouter>
            </ErrorBoundary>
        </StrictMode>
    );
}

initializeTheme();
