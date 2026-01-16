'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Store, User, Shield, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface LoginOption {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    color: string;
}

const loginOptions: LoginOption[] = [
    {
        title: 'Brand',
        description: 'Manage your cannabis brand, products, and retail partnerships.',
        href: '/brand-login',
        icon: <Building2 className="h-8 w-8" />,
        color: 'bg-gradient-to-br from-emerald-500 to-green-600'
    },
    {
        title: 'Dispensary',
        description: 'Manage your dispensary location, inventory, and orders.',
        href: '/dispensary-login',
        icon: <Store className="h-8 w-8" />,
        color: 'bg-gradient-to-br from-blue-500 to-indigo-600'
    },
    {
        title: 'Customer',
        description: 'View your order history and manage preferences.',
        href: '/customer-login',
        icon: <User className="h-8 w-8" />,
        color: 'bg-gradient-to-br from-purple-500 to-pink-600'
    },
    {
        title: 'SuperUser',
        description: 'Platform administration and system management.',
        href: '/admin-login',
        icon: <Shield className="h-8 w-8" />,
        color: 'bg-gradient-to-br from-orange-500 to-red-600'
    }
];

export default function LoginPortalPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome to BakedBot</h1>
                <p className="text-muted-foreground text-lg">Select your account type to continue</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl w-full">
                {loginOptions.map((option) => (
                    <Link key={option.title} href={option.href} className="group">
                        <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/50">
                            <CardHeader className="pb-3">
                                <div className={`w-14 h-14 rounded-xl ${option.color} text-white flex items-center justify-center mb-3 shadow-lg`}>
                                    {option.icon}
                                </div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {option.title}
                                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-sm">
                                    {option.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>Need help? <a href="/contact" className="underline hover:text-primary">Contact Support</a></p>
            </div>
        </div>
    );
}
