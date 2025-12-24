'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Code, Download, Store, Users } from 'lucide-react';
import DomainSettingsTab from './components/domain-tab';
import EmbedGeneratorTab from './components/embed-tab';
import WordPressPluginTab from './components/wordpress-tab';
import BrandSetupTab from './components/brand-setup-tab';
import { InvitationsList } from '@/components/invitations/invitations-list';
import { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/firebase/auth/use-user';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { role } = useUserRole();
  const { user } = useUser();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Cast user to any to access role-specific fields
    const profile = user as any;

    if (role === 'brand' && profile.brandId) {
      setPreviewUrl(`/${profile.brandId}`);
    } else if (role === 'dispensary' && profile.locationId) {
      setPreviewUrl(`/shop/${profile.locationId}`);
    } else if (role === 'owner') {
      // Owners might want to see demo or a specific one, fallback to demo for now
      setPreviewUrl('/demo');
    }
  }, [user, role]);

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
          <TabsTrigger value="domain">
            <Globe className="mr-2 h-4 w-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="wordpress">
            <Download className="mr-2 h-4 w-4" />
            WordPress Plugin
          </TabsTrigger>
          {(role === 'brand' || role === 'dispensary' || role === 'owner') && (
             <TabsTrigger value="team">
                <Users className="mr-2 h-4 w-4" />
                Team
             </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="brand" className="space-y-4">
          <BrandSetupTab />
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

        <TabsContent value="team" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Team Management</CardTitle>
                    <CardDescription>Invite team members to your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Pass role context dynamically. For now assuming active org context is set in invite dialog or server action */}
                    <InvitationsList 
                        orgId={(user as any)?.brandId || (user as any)?.locationId} // Simplified context passing
                        allowedRoles={role === 'brand' ? ['brand'] : ['dispensary']} 
                    />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

