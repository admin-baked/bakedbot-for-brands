'use client';
export const dynamic = 'force-dynamic';

import LoginForm from '../customer-login/components/login-form';

export default function BrandLoginPage() {
    return (
        <LoginForm 
            title="Brand Portal"
            description="Sign in to your brand account."
            devLogins={[{ email: 'brand@bakedbot.ai', label: 'Login as brand@bakedbot.ai (Brand)' }]}
        />
    );
}
