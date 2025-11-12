
// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DispensaryLoginForm from './components/login-form';

export default function DispensaryLoginPage() {
    return <DispensaryLoginForm />;
}
