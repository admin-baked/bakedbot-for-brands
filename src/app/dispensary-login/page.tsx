import LoginForm from '../customer-login/components/login-form';

export default function DispensaryLoginPage() {
    return (
        <LoginForm 
            title="Dispensary Portal"
            description="Sign in to manage your orders."
            devLogins={[{ email: 'dispensary@bakedbot.ai', label: 'Login as dispensary@bakedbot.ai (Dispensary)' }]}
        />
    );
}
