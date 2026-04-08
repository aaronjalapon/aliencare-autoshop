import AppLayout from '@/components/layout/app-layout';
import { UserProfileContent } from '@/components/shared/user-profile-content';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Profile', href: '/profile' },
];

export default function FrontdeskProfile() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <UserProfileContent />
        </AppLayout>
    );
}
