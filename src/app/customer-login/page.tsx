import LoginForm from './components/login-form';

export default function CustomerLoginPage() {
    return (
        <LoginForm 
            title="Customer Login"
            description="Sign in or create an account to get started."
            devLogins={[{ email: 'customer@bakedbot.ai', label: 'Login as customer@bakedbot.ai (Customer)' }]}
        />
    );
}
