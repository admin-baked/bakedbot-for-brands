'use client';

/**
 * Unified Analytics Page
 *
 * Consolidates all analytics-related tabs into a single page with sub-navigation:
 * - Platform: Signups, active users, revenue metrics
 * - Usage: System resource and activity metrics
 * - Intelligence: Competitive intel, market research, insights
 */

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart3,
    Activity,
    Search,
    Loader2,
    TrendingUp,
    Users,
    Target
} from 'lucide-react';

// Lazy load the individual tab components
const TabLoader = () => (
    <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
);

const PlatformAnalyticsTab = dynamic(
    () => import('./platform-analytics-tab'),
    { loading: TabLoader }
);

const UsageTab = dynamic(
    () => import('./usage-tab'),
    { loading: TabLoader }
);

const EzalTab = dynamic(
    () => import('./ezal-tab'),
    { loading: TabLoader }
);

const CompetitorIntelTab = dynamic(
    () => import('./competitor-intel-tab'),
    { loading: TabLoader }
);

const ResearchTab = dynamic(
    () => import('./research-tab'),
    { loading: TabLoader }
);

const SuperAdminInsightsTab = dynamic(
    () => import('./super-admin-insights-tab').then(mod => mod.SuperAdminInsightsTab),
    { loading: TabLoader }
);

// Sub-tab types
type AnalyticsSubTab = 'platform' | 'usage' | 'intelligence';
type IntelligenceSubTab = 'insights' | 'ezal' | 'competitor' | 'research';

export default function UnifiedAnalyticsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Get sub-tab from URL or default to 'platform'
    const subTab = (searchParams?.get('sub') as AnalyticsSubTab) || 'platform';
    const intelTab = (searchParams?.get('intel') as IntelligenceSubTab) || 'insights';

    const [activeTab, setActiveTab] = useState<AnalyticsSubTab>(subTab);
    const [activeIntelTab, setActiveIntelTab] = useState<IntelligenceSubTab>(intelTab);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as AnalyticsSubTab);
        // Update URL without full navigation
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('sub', tab);
        params.delete('intel'); // Reset intel sub-tab when switching main tabs
        router.replace(`/dashboard/ceo?tab=analytics&${params.toString()}`, { scroll: false });
    };

    const handleIntelTabChange = (tab: string) => {
        setActiveIntelTab(tab as IntelligenceSubTab);
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('sub', 'intelligence');
        params.set('intel', tab);
        router.replace(`/dashboard/ceo?tab=analytics&${params.toString()}`, { scroll: false });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Analytics & Insights</h1>
                <p className="text-muted-foreground">
                    Platform metrics, usage patterns, and competitive intelligence
                </p>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="platform" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Platform</span>
                    </TabsTrigger>
                    <TabsTrigger value="usage" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="hidden sm:inline">Usage</span>
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline">Intelligence</span>
                    </TabsTrigger>
                </TabsList>

                {/* Platform Analytics */}
                <TabsContent value="platform" className="space-y-4">
                    <PlatformAnalyticsTab />
                </TabsContent>

                {/* Usage Metrics */}
                <TabsContent value="usage" className="space-y-4">
                    <UsageTab />
                </TabsContent>

                {/* Intelligence - with nested tabs */}
                <TabsContent value="intelligence" className="space-y-4">
                    <Tabs value={activeIntelTab} onValueChange={handleIntelTabChange}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="insights" className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Insights
                            </TabsTrigger>
                            <TabsTrigger value="ezal" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Ezal Analysis
                            </TabsTrigger>
                            <TabsTrigger value="competitor" className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Competitor Intel
                            </TabsTrigger>
                            <TabsTrigger value="research" className="flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                Deep Research
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="insights">
                            <SuperAdminInsightsTab />
                        </TabsContent>
                        <TabsContent value="ezal">
                            <EzalTab />
                        </TabsContent>
                        <TabsContent value="competitor">
                            <CompetitorIntelTab />
                        </TabsContent>
                        <TabsContent value="research">
                            <ResearchTab />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export { UnifiedAnalyticsPage };
