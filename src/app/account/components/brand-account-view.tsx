
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BrandAccountViewProps {
  user: { name?: string | null; email?: string | null, role?: string | null };
}

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function BrandAccountView({ user }: BrandAccountViewProps) {
  return (
    <div className="container mx-auto max-w-lg py-12 px-4">
      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 text-3xl">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="mt-4 text-2xl">{user.name || 'Account'}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">Your role is: <span className="font-semibold capitalize text-foreground">{user.role}</span></p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" className="w-full">Edit Profile</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
