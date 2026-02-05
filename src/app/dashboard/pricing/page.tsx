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
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('rules');
  const router = useRouter();

  const handleCreateRule = () => {
    // Navigate to inbox with pricing thread type
    router.push('/dashboard/inbox?create=pricing');
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
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <PricingRulesList onCreateRule={handleCreateRule} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-12 text-center">
            <div className="text-muted-foreground text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Rule performance charts, price timelines, and competitor comparisons
              will be available here.
            </p>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-12 text-center">
            <div className="text-muted-foreground text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold mb-2">Inventory Intelligence Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Clearance urgency indicators, slow-moving inventory, and velocity
              trends will be available here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
