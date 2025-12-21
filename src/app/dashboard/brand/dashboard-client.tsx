'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BrandOverviewView } from './components/brand-overview-view';
import { ModularDashboard } from '@/components/dashboard/modular/modular-dashboard';
import { LayoutDashboard, Grip } from 'lucide-react';

export default function BrandDashboardClient({ brandId }: { brandId: string }) {
    const [view, setView] = useState<'overview' | 'modular'>('modular');

    return (
        <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
                <Tabs value={view} onValueChange={(v) => setView(v as 'overview' | 'modular')}>
                    <TabsList className="h-8">
                        <TabsTrigger value="overview" className="text-xs gap-1.5 px-3">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="modular" className="text-xs gap-1.5 px-3">
                            <Grip className="h-3.5 w-3.5" />
                            Customize
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            {view === 'overview' ? (
                <BrandOverviewView brandId={brandId} />
            ) : (
                <ModularDashboard role="brand" />
            )}
        </div>
    );
}
