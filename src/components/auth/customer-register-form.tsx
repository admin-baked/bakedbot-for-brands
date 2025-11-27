/**
 * Customer Registration Form Component
 * Handles email/password and Google OAuth registration
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { registerWithEmail, registerWithGoogle, getAuthErrorMessage } from '@/lib/auth/customer-auth';

const registerSchema = z.object({
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    acceptTerms: z.boolean().refine(val => val === true, {
        message: 'You must accept the terms and conditions',
    }),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function CustomerRegisterForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const password = watch('password');

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        try {
            await registerWithEmail({
                email: data.email,
                password: data.password,
                displayName: data.displayName,
                phone: data.phone,
            });

            toast({
                title: 'Account created!',
                description: 'Please check your email to verify your account.',
            });

            router.push('/customer/profile');
        } catch (error: any) {
            toast({
                title: 'Registration failed',
                description: getAuthErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        setIsGoogleLoading(true);
        try {
            await registerWithGoogle();

            toast({
                title: 'Account created!',
                description: 'Welcome to BakedBot!',
            });

            router.push('/customer/profile');
        } catch (error: any) {
            toast({
                title: 'Registration failed',
                description: getAuthErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const getPasswordStrength = (pwd: string): { label: string; color: string } => {
        if (!pwd) return { label: '', color: '' };

        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;

        if (strength <= 1) return { label: 'Weak', color: 'text-red-500' };
        if (strength === 2) return { label: 'Fair', color: 'text-yellow-500' };
        if (strength === 3) return { label: 'Good', color: 'text-blue-500' };
        return { label: 'Strong', color: 'text-green-500' };
    };

    const passwordStrength = getPasswordStrength(password);

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Display Name */}
                <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input
                        id="displayName"
                        {...register('displayName')}
                        placeholder="John Doe"
                        disabled={isLoading}
                    />
                    {errors.displayName && (
                        <p className="text-sm text-destructive">{errors.displayName.message}</p>
                    )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="john@example.com"
                        disabled={isLoading}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                {/* Phone (Optional) */}
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                        id="phone"
                        type="tel"
                        {...register('phone')}
                        placeholder="(555) 123-4567"
                        disabled={isLoading}
                    />
                    {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        {...register('password')}
                        placeholder="••••••••"
                        disabled={isLoading}
                    />
                    {password && (
                        <p className={`text-sm ${passwordStrength.color}`}>
                            Password strength: {passwordStrength.label}
                        </p>
                    )}
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        {...register('confirmPassword')}
                        placeholder="••••••••"
                        disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                </div>

                {/* Terms Acceptance */}
                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="acceptTerms"
                        {...register('acceptTerms')}
                        disabled={isLoading}
                    />
                    <Label
                        htmlFor="acceptTerms"
                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        I agree to the{' '}
                        <a href="/legal/terms" className="text-primary underline" target="_blank">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/legal/privacy" className="text-primary underline" target="_blank">
                            Privacy Policy
                        </a>
                    </Label>
                </div>
                {errors.acceptTerms && (
                    <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                </Button>
            </form>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
            </div>

            {/* Google OAuth */}
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleRegister}
                disabled={isLoading || isGoogleLoading}
            >
                {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
                Continue with Google
            </Button>

            {/* Login Link */}
            <div className="text-center text-sm">
                Already have an account?{' '}
                <a href="/customer/login" className="text-primary underline">
                    Sign in
                </a>
            </div>
        </div>
    );
}
