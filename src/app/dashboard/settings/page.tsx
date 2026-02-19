'use client';



import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Code, Download, Store, Users, Palette, Bot, Plug, Sparkles } from 'lucide-react';
import DomainSettingsTab from './components/domain-tab';
import EmbedGeneratorTab from './components/embed-tab';
import WordPressPluginTab from './components/wordpress-tab';
import BrandSetupTab from './components/brand-setup-tab';
import BrandThemingTab from './components/brand-theming-tab';
import { ChatbotSettingsTab } from './components/chatbot-settings-tab';
import { AISettingsTab } from './components/ai-settings-tab';
import { InvitationsList } from '@/components/invitations/invitations-list';
import { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BillingForm } from './components/billing-form';
import { CreditCard } from 'lucide-react';
import { SidecarHealthCheck } from '@/components/settings/sidecar-health';
import { NotebookLMAuth } from '@/components/settings/notebooklm-auth';
import { GmailConnection } from './components/gmail-connection';

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/firebase/auth/use-user';
import { useState, useEffect, Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';

export default function SettingsPage() {
  const { role, isBrandRole, isDispensaryRole, hasBrandAdminAccess, hasDispensaryAdminAccess, isSuperUser } = useUserRole();
  const { user } = useUser();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    // Cast user to any to access role-specific fields
    const profile = user as any;

    if (isBrandRole && profile.brandId) {
      setPreviewUrl(`/${profile.brandId}`);
    } else if (isDispensaryRole && profile.locationId) {
      setPreviewUrl(`/shop/${profile.locationId}`);
    } else if (isSuperUser) {
      setPreviewUrl('/demo');
    }
    
    // Fetch plan ID for chatbot config
    const orgId = profile.brandId || profile.locationId;
    if (orgId) {
      getDoc(doc(db, 'tenants', orgId)).then((snap) => {
        if (snap.exists()) {
          setPlanId(snap.data()?.planId);
        }
      }).catch(console.error);
    }
  }, [user, isBrandRole, isDispensaryRole, isSuperUser]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your brand identity, domain, and website integrations.
          </p>
        </div>

        {previewUrl && (
          <Button asChild variant="outline" className="gap-2 border-2">
            <Link href={previewUrl} target="_blank">
              Preview Menu <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="brand" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 border">
          <TabsTrigger value="brand">
            <Store className="mr-2 h-4 w-4" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="embeds">
            <Code className="mr-2 h-4 w-4" />
            Embeds
          </TabsTrigger>
          <TabsTrigger value="theming">
            <Palette className="mr-2 h-4 w-4" />
            Theming
          </TabsTrigger>
          <TabsTrigger value="chatbot">
            <Bot className="mr-2 h-4 w-4" />
            Chatbot
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="mr-2 h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="domain">
            <Globe className="mr-2 h-4 w-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="wordpress">
            <Download className="mr-2 h-4 w-4" />
            WordPress Plugin
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          {(hasBrandAdminAccess || hasDispensaryAdminAccess) && (
            <TabsTrigger value="team">
              <Users className="mr-2 h-4 w-4" />
              Team
            </TabsTrigger>
          )}
          {(hasBrandAdminAccess || hasDispensaryAdminAccess) && (
            <TabsTrigger value="billing">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="brand" className="space-y-4">
          <BrandSetupTab />
        </TabsContent>

        <TabsContent value="theming" className="space-y-4">
          <BrandThemingTab />
        </TabsContent>

        <TabsContent value="chatbot" className="space-y-4">
          <ChatbotSettingsTab planId={planId} />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AISettingsTab />
        </TabsContent>

        <TabsContent value="embeds" className="space-y-4">
          <EmbedGeneratorTab />
        </TabsContent>

        <TabsContent value="domain" className="space-y-4">
          <DomainSettingsTab />
        </TabsContent>

        <TabsContent value="wordpress" className="space-y-4">
          <WordPressPluginTab />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Suspense fallback={<Card className="p-6 animate-pulse"><div className="h-20 bg-muted rounded" /></Card>}>
            <GmailConnection />
          </Suspense>
          <SidecarHealthCheck />
          <NotebookLMAuth />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Manage team members and invitations.
                <Button asChild variant="link" className="ml-2">
                  <Link href="/dashboard/settings/team">Full Team Management →</Link>
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Quick view of recent invitations */}
              <InvitationsList
                orgId={(user as any)?.brandId || (user as any)?.locationId || (user as any)?.orgId || (user as any)?.currentOrgId}
                allowedRoles={isBrandRole ? ['brand_admin', 'brand_member'] : ['dispensary_admin', 'dispensary_staff']}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <BillingForm
            organizationId={(user as any)?.brandId || (user as any)?.locationId || (user as any)?.orgId || (user as any)?.currentOrgId || user?.uid}
            locationCount={1} // Defaulting to 1 for now, should ideally be fetched from data
            customerEmail={user?.email || undefined}
            customerName={user?.displayName || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

