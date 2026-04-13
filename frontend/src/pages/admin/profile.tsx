import AdminLayout from '@/components/layout/admin-layout';
import { UserProfileContent } from '@/components/shared/user-profile-content';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Profile', href: '/admin/profile' },
];

export default function AdminProfile() {
    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <UserProfileContent showTitle={false} subtitle="Manage your administrator account details and access preferences." />
        </AdminLayout>
    );
}
