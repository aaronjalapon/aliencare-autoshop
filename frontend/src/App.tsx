import { CustomerOnboardingOnlyRoute, GuestRoute, ProtectedRoute } from '@/router';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

// Layouts
import AuthLayout from '@/components/layout/auth-layout';

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
import Billing from '@/pages/dashboard/billing';
import Customers from '@/pages/dashboard/customers';
import Dashboard from '@/pages/dashboard/dashboard';
import Inventory from '@/pages/dashboard/Inventory';
import JobOrders from '@/pages/dashboard/job-orders';
import PointOfSale from '@/pages/dashboard/pos';
import FrontdeskProfile from '@/pages/dashboard/profile';
import Reports from '@/pages/dashboard/reports';
import Services from '@/pages/dashboard/services';
import FrontdeskSettings from '@/pages/dashboard/settings';

// Admin pages
import AdminBookingSlots from '@/pages/admin/booking-slots';
import AdminDashboard from '@/pages/admin/dashboard';
import FrontDeskAccounts from '@/pages/admin/frontdesk-accounts';
import AdminNotifications from '@/pages/admin/notifications';
import AdminProfile from '@/pages/admin/profile';
import AdminSettings from '@/pages/admin/settings';

// Customer pages
import BillingPayment from '@/pages/customer/billing-payment';
import CustomerDashboard from '@/pages/customer/dashboard';
import CustomerLogs from '@/pages/customer/logs';
import MyServices from '@/pages/customer/my-services';
import CustomerNotifications from '@/pages/customer/notifications';
import CustomerOnboarding from '@/pages/customer/onboarding';
import CustomerProfile from '@/pages/customer/profile';
import CustomerReservations from '@/pages/customer/reservations';
import CustomerServices from '@/pages/customer/services';
import CustomerSettings from '@/pages/customer/settings';
import CustomerShop from '@/pages/customer/shop';

// Front Desk extra pages
import FrontdeskNotifications from '@/pages/dashboard/notifications';

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/faqs" element={<FAQs />} />

            {/* Guest-only routes (auth) */}
            <Route
                element={
                    <GuestRoute>
                        <Login />
                    </GuestRoute>
                }
                path="/login"
            />
            <Route
                element={
                    <GuestRoute>
                        <Register />
                    </GuestRoute>
                }
                path="/register"
            />
            <Route
                element={
                    <GuestRoute>
                        <AuthLayout />
                    </GuestRoute>
                }
            >
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
                <Route path="/notifications" element={<FrontdeskNotifications />} />
                <Route path="/confirm-password" element={<ConfirmPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Settings */}
                <Route path="/settings" element={<FrontdeskSettings />} />
                <Route path="/settings/profile" element={<Navigate to="/settings" replace />} />
                <Route path="/settings/password" element={<Navigate to="/settings" replace />} />
                <Route path="/settings/appearance" element={<Navigate to="/settings" replace />} />
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
                <Route path="/admin/booking-slots" element={<AdminBookingSlots />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
            </Route>

            {/* Customer protected routes */}
            <Route
                element={
                    <ProtectedRoute allowedRoles={['customer']}>
                        <Outlet />
                    </ProtectedRoute>
                }
            >
                <Route
                    path="/customer/onboarding"
                    element={
                        <CustomerOnboardingOnlyRoute>
                            <CustomerOnboarding />
                        </CustomerOnboardingOnlyRoute>
                    }
                />
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/customer/services" element={<CustomerServices />} />
                <Route path="/customer/my-services" element={<MyServices />} />
                <Route path="/customer/reservations" element={<CustomerReservations />} />
                <Route path="/customer/shop" element={<CustomerShop />} />
                <Route path="/customer/billing" element={<BillingPayment />} />
                <Route path="/customer/profile" element={<CustomerProfile />} />
                <Route path="/customer/logs" element={<CustomerLogs />} />
                <Route path="/customer/settings" element={<CustomerSettings />} />
                <Route path="/customer/notifications" element={<CustomerNotifications />} />
            </Route>
        </Routes>
    );
}
