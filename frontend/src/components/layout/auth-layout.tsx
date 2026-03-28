import AuthLayoutTemplate from '@/components/layout/auth/auth-simple-layout';
import { Outlet } from 'react-router-dom';

export default function AuthLayout({
    children,
    title = '',
    description = '',
    ...props
}: {
    children?: React.ReactNode;
    title?: string;
    description?: string;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description} {...props}>
            {children || <Outlet />}
        </AuthLayoutTemplate>
    );
}
