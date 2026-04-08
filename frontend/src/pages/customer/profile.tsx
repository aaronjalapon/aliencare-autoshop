import CustomerLayout from '@/components/layout/customer-layout';
import { UserProfileContent } from '@/components/shared/user-profile-content';

export default function CustomerProfile() {
    return (
        <CustomerLayout>
            <UserProfileContent />
        </CustomerLayout>
    );
}
