'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Code, Download } from 'lucide-react';
import DomainSettingsTab from './components/domain-tab';
import EmbedGeneratorTab from './components/embed-tab';
import WordPressPluginTab from './components/wordpress-tab';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your domain, website integrations, and download plugins.
        </p>
      </div>

      <Tabs defaultValue="embeds" className="space-y-4">
        <TabsList>
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
        </TabsList>

        <TabsContent value="embeds" className="space-y-4">
          <EmbedGeneratorTab />
        </TabsContent>

        <TabsContent value="domain" className="space-y-4">
          <DomainSettingsTab />
        </TabsContent>

        <TabsContent value="wordpress" className="space-y-4">
          <WordPressPluginTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
