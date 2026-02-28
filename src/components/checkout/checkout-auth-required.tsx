'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CheckoutAuthRequiredProps = {
    title: string;
    description: string;
    nextPath: string;
};

function toSafeRelativePath(path: string): string {
    if (!path || typeof path !== 'string') return '/checkout';
    if (!path.startsWith('/')) return '/checkout';
    if (path.startsWith('//')) return '/checkout';
    return path;
}

export function CheckoutAuthRequired({ title, description, nextPath }: CheckoutAuthRequiredProps) {
    const safeNext = toSafeRelativePath(nextPath);
    const href = `/signin?next=${encodeURIComponent(safeNext)}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Create an account or sign in to continue checkout and securely link this order to your profile.
                </p>
                <Button asChild className="w-full">
                    <Link href={href}>Sign In or Create Account</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

