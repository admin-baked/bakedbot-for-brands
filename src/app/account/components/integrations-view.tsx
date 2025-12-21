'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function IntegrationsView() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connect your tech stack to BakedBot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <h3 className="text-lg font-medium">Coming Soon</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                        We are building integrations for POS (Dutchie, Blaze, Cova), CRM (Alpine IQ, Springbig), and eCommerce platforms.
                    </p>
                    <Button variant="outline" className="mt-4" disabled>
                        View Roadmap
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
