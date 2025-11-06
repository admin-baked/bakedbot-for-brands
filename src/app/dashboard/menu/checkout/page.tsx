'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function CheckoutPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Checkout</CardTitle>
                    <CardDescription>
                        This is the beginning of the headless checkout flow. Next steps will involve adding a form for customer details and a location selector.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center p-8 border-dashed border-2 rounded-md">
                        <p className="text-muted-foreground">Checkout form will be here.</p>
                    </div>
                </CardContent>
                <CardContent>
                    <Button asChild variant="outline" className='w-full'>
                        <Link href="/dashboard/menu">
                            Return to Menu
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
