import { GuestRoute, ProtectedRoute } from '@/router';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

// Layouts
import AuthLayout from '@/components/layout/auth-layout';
import SettingsLayout from '@/components/layout/settings/layout';

// Public pages
import AboutUs from '@/pages/aboutus';
import FAQs from '@/pages/faqs';
import Welcome from '@/pages/welcome';

// Auth pages
import ConfirmPassword from '@/pages/auth/confirm-password';
import ForgotPassword from '@/pages/auth/forgot-password';
import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';
import ResetPassword from '@/pages/auth/reset-password';
import VerifyEmail from '@/pages/auth/verify-email';

// Front Desk pages
import Dashboard from '@/pages/dashboard/dashboard';
import FrontdeskProfile from '@/pages/dashboard/profile';
import Inventory from '@/pages/dashboard/Inventory';
import Services from '@/pages/dashboard/services';
import JobOrders from '@/pages/dashboard/job-orders';
import PointOfSale from '@/pages/dashboard/pos';
import Billing from '@/pages/dashboard/billing';
import Customers from '@/pages/dashboard/customers';
import Reports from '@/pages/dashboard/reports';

// Settings pages
import Appearance from '@/pages/settings/appearance';
import Password from '@/pages/settings/password';
import Profile from '@/pages/settings/profile';

// Admin pages
import AdminDashboard from '@/pages/admin/dashboard';
import FrontDeskAccounts from '@/pages/admin/frontdesk-accounts';
import AdminProfile from '@/pages/admin/profile';

// Customer pages
import CustomerDashboard from '@/pages/customer/dashboard';
import CustomerServices from '@/pages/customer/services';
import MyServices from '@/pages/customer/my-services';
import BillingPayment from '@/pages/customer/billing-payment';
import CustomerProfile from '@/pages/customer/profile';
import CustomerLogs from '@/pages/customer/logs';

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/faqs" element={<FAQs />} />

            {/* Guest-only routes (auth) */}
            <Route element={<GuestRoute><Login /></GuestRoute>} path="/login" />
            <Route element={<GuestRoute><Register /></GuestRoute>} path="/register" />
            <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
            </Route>

            {/* Front Desk protected routes */}
            <Route
                element={
                    <ProtectedRoute allowedRoles={['frontdesk']}>
                        <Outlet />
                    </ProtectedRoute>
                }
            >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<FrontdeskProfile />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/services" element={<Services />} />
                <Route path="/job-orders" element={<JobOrders />} />
                <Route path="/pos" element={<PointOfSale />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
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

            {/* Admin protected routes */}
            <Route
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Outlet />
                    </ProtectedRoute>
                }
            >
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/profile" element={<AdminProfile />} />
                <Route path="/admin/frontdesk-accounts" element={<FrontDeskAccounts />} />
            </Route>

            {/* Customer protected routes */}
            <Route
                element={
                    <ProtectedRoute allowedRoles={['customer']}>
                        <Outlet />
                    </ProtectedRoute>
                }
            >
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/customer/services" element={<CustomerServices />} />
                <Route path="/customer/my-services" element={<MyServices />} />
                <Route path="/customer/billing" element={<BillingPayment />} />
                <Route path="/customer/profile" element={<CustomerProfile />} />
                <Route path="/customer/logs" element={<CustomerLogs />} />
            </Route>
        </Routes>
    );
}
