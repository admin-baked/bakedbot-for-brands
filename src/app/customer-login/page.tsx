// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import LoginForm from './components/login-form';

export default function CustomerLoginPage() {
    return (
        <LoginForm />
    );
}
