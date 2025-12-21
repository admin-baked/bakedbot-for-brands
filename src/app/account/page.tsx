
import type { Metadata } from 'next';
import { AccountTabs } from './components/account-tabs';
import { ProfileView } from './components/profile-view';
import { SubscriptionView } from './components/subscription-view';
import { IntegrationsView } from './components/integrations-view';
import { TabsContent } from '@/components/ui/tabs';

// Metadata must be in valid Server Component if using generating metadata, 
// but we are switching this file to Client Component or keeping it Server Component 
// that renders Client Components.
// To keep metadata export, this file should remain a Server Component.
// The components imported are 'use client'.

export const metadata: Metadata = {
  title: 'Account | BakedBot AI',
};

export default function AccountPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal profile, organization subscription, and integrations.
        </p>
      </header>

      <AccountTabs defaultValue="profile">
        <TabsContent value="profile" className="mt-6 space-y-4">
          <ProfileView />
        </TabsContent>
        <TabsContent value="subscription" className="mt-6 space-y-4">
          <SubscriptionView />
        </TabsContent>
        <TabsContent value="integrations" className="mt-6 space-y-4">
          <IntegrationsView />
        </TabsContent>
      </AccountTabs>
    </main>
  );
}
