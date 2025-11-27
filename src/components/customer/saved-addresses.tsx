/**
 * Saved Addresses Component
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plus } from 'lucide-react';

export function SavedAddresses() {
    // TODO: Fetch addresses from Firestore
    const addresses: any[] = [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Saved Addresses</CardTitle>
                    <CardDescription>Manage your delivery addresses</CardDescription>
                </div>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                </Button>
            </CardHeader>
            <CardContent>
                {addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No addresses saved</h3>
                        <p className="text-sm text-muted-foreground">
                            Add an address for faster checkout
                        </p>
                    </div>
                ) : (
                    <div>
                        {/* Address list will go here */}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
