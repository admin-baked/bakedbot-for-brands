// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

/**
 * Dynamic Pricing Dashboard
 *
 * Main dashboard for managing dynamic pricing rules and viewing analytics.
 * Features tabbed interface with Rules, Analytics, and Inventory views.
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import { PricingKPIGrid } from './components/pricing-kpi-grid';
import { PricingRulesList } from './components/pricing-rules-list';
import { InventoryIntelligenceTab } from './components/inventory-intelligence-tab';
import { PricingAnalyticsTab } from './components/pricing-analytics-tab';
import { PublishToMenuTab } from './components/publish-to-menu-tab';
import { TemplateBrowser } from './components/template-browser';
import { useRouter } from 'next/navigation';
import { useDispensaryId } from '@/hooks/use-dispensary-id';

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('rules');
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const { dispensaryId } = useDispensaryId();

  const handleCreateRule = () => {
    // Navigate to inbox with pricing thread type
    router.push('/dashboard/inbox?create=pricing');
  };

  const handleRuleCreated = () => {
    // Refresh the rules list
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
            Dynamic Pricing
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered price optimization and rule management
          </p>
        </div>
        <Button onClick={handleCreateRule} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* KPI Cards */}
      <PricingKPIGrid />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Active Rules</TabsTrigger>
          <TabsTrigger value="publish">Publish to Menu</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-8">
          {/* Template Browser */}
          {dispensaryId && (
            <TemplateBrowser orgId={dispensaryId} onRuleCreated={handleRuleCreated} />
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Your Rules</span>
            </div>
          </div>

          {/* Existing Rules */}
          <PricingRulesList key={refreshKey} onCreateRule={handleCreateRule} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <PricingAnalyticsTab />
        </TabsContent>

        {/* Publish to Menu Tab */}
        <TabsContent value="publish" className="space-y-4">
          <PublishToMenuTab />
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <InventoryIntelligenceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
