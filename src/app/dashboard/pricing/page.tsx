'use client';

/**
 * Dynamic Pricing Dashboard
 *
 * Main dashboard for managing dynamic pricing rules and viewing analytics.
 * Create Rule opens an inline Sheet (no inbox redirect).
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Plus, TrendingUp, Sparkles } from 'lucide-react';
import { PricingKPIGrid } from './components/pricing-kpi-grid';
import { PricingRulesList } from './components/pricing-rules-list';
import { InventoryIntelligenceTab } from './components/inventory-intelligence-tab';
import { PricingAnalyticsTab } from './components/pricing-analytics-tab';
import { PublishToMenuTab } from './components/publish-to-menu-tab';
import { TemplateBrowser } from './components/template-browser';
import { useDispensaryId } from '@/hooks/use-dispensary-id';

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('rules');
  const [refreshKey, setRefreshKey] = useState(0);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const { dispensaryId } = useDispensaryId();

  const handleRuleCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setCreateSheetOpen(false);
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
        <Button onClick={() => setCreateSheetOpen(true)} className="gap-2">
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

        {/* Rules Tab — just the rules list, no template browser */}
        <TabsContent value="rules" className="space-y-4">
          <PricingRulesList
            key={refreshKey}
            onCreateRule={() => setCreateSheetOpen(true)}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <PricingAnalyticsTab />
        </TabsContent>

        <TabsContent value="publish" className="space-y-4">
          <PublishToMenuTab />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <InventoryIntelligenceTab />
        </TabsContent>
      </Tabs>

      {/* Create Rule Sheet — replaces inbox redirect */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[680px] sm:max-w-[680px] overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Pricing Rule
            </SheetTitle>
            <SheetDescription>
              Choose a template, set your discount, and pick which products it applies to.
            </SheetDescription>
          </SheetHeader>

          {dispensaryId && (
            <TemplateBrowser orgId={dispensaryId} onRuleCreated={handleRuleCreated} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
