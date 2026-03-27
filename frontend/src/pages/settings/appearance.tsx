import AppearanceTabs from '@/components/shared/appearance-tabs';
import HeadingSmall from '@/components/shared/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/components/layout/app-layout';
import SettingsLayout from '@/components/layout/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Appearance settings" description="Update your account's appearance settings" />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
