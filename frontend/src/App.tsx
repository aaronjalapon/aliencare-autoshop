import { GuestRoute, ProtectedRoute } from '@/router';
import { Navigate, Route, Routes } from 'react-router-dom';

// Layouts
import AppLayout from '@/components/layout/app-layout';
import AuthLayout from '@/components/layout/auth-layout';
import SettingsLayout from '@/components/layout/settings/layout';

// Public pages
import AboutUs from '@/pages/aboutus';
import Welcome from '@/pages/welcome';

// Auth pages
import ConfirmPassword from '@/pages/auth/confirm-password';
import ForgotPassword from '@/pages/auth/forgot-password';
import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';
import ResetPassword from '@/pages/auth/reset-password';
import VerifyEmail from '@/pages/auth/verify-email';

// Dashboard pages
import Dashboard from '@/pages/dashboard/dashboard';
import Inventory from '@/pages/dashboard/Inventory';

// Settings pages
import Appearance from '@/pages/settings/appearance';
import Password from '@/pages/settings/password';
import Profile from '@/pages/settings/profile';

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/about" element={<AboutUs />} />

            {/* Guest-only routes (auth) */}
            <Route
                element={
                    <GuestRoute>
                        <AuthLayout />
                    </GuestRoute>
                }
            >
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
            </Route>

            {/* Protected routes */}
            <Route
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/confirm-password" element={<ConfirmPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Settings */}
                <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
                <Route
                    path="/settings/profile"
                    element={
                        <SettingsLayout>
                            <Profile />
                        </SettingsLayout>
                    }
                />
                <Route
                    path="/settings/password"
                    element={
                        <SettingsLayout>
                            <Password />
                        </SettingsLayout>
                    }
                />
                <Route
                    path="/settings/appearance"
                    element={
                        <SettingsLayout>
                            <Appearance />
                        </SettingsLayout>
                    }
                />
            </Route>
        </Routes>
    );
}
