/**
 * Customer Profile Page
 */

'use client';

import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileInfo } from '@/components/customer/profile-info';
import { OrderHistory } from '@/components/customer/order-history';
import { SavedAddresses } from '@/components/customer/saved-addresses';
import { AccountSettings } from '@/components/customer/account-settings';

export default function CustomerProfilePage() {
    return (
        <ProtectedRoute>
            <div className="container max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">My Account</h1>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="addresses">Addresses</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4">
                        <ProfileInfo />
                    </TabsContent>

                    <TabsContent value="orders" className="space-y-4">
                        <OrderHistory />
                    </TabsContent>

                    <TabsContent value="addresses" className="space-y-4">
                        <SavedAddresses />
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                        <AccountSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </ProtectedRoute>
    );
}
