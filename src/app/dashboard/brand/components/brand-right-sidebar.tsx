'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Zap,
    Users,
    Search,
    Megaphone,
    Briefcase
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EzalSnapshotCard } from '@/components/dashboard/ezal-snapshot-card';

interface BrandRightRailProps {
    userState?: string;
}

export function BrandRightRail({ userState = 'Michigan' }: BrandRightRailProps) {
    const { toast } = useToast();

    const handleAction = (action: string) => {
        toast({
            title: "Action Triggered",
            description: `Started: ${action}`,
        });
    };

    return (
        <div className="space-y-6">
            {/* A) Alerts */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Brand Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="font-medium">3 stores out of stock (Top SKU)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>2 retailers pricing below MAP</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span>Campaign deliverability dip</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Compliance clean in IL, MI</span>
                    </div>
                </CardContent>
            </Card>

            {/* B) Quick Actions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Launch Compliant Campaign')}>
                        <Megaphone className="h-3 w-3 mr-2" />
                        Launch Compliant Campaign
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Generate Sell Sheet')}>
                        <FileText className="h-3 w-3 mr-2" />
                        Generate Retail Sell Sheet
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Competitor Price Scan')}>
                        <Search className="h-3 w-3 mr-2" />
                        Run Competitor Price Scan
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Build Buyer List')}>
                        <Users className="h-3 w-3 mr-2" />
                        Build Buyer Target List
                    </Button>
                </CardContent>
            </Card>

            {/* C) Run Agents */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Run Agents
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    <Button variant="ghost" size="sm" className="h-auto py-2 flex flex-col gap-1 items-start border bg-muted/20">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Demand</span>
                        <span className="text-xs font-medium">Craig</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-2 flex flex-col gap-1 items-start border bg-muted/20">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Insights</span>
                        <span className="text-xs font-medium">Pops</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-2 flex flex-col gap-1 items-start border bg-muted/20">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Intel</span>
                        <span className="text-xs font-medium">Ezal</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-2 flex flex-col gap-1 items-start border bg-muted/20">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Finance</span>
                        <span className="text-xs font-medium">Mike</span>
                    </Button>
                </CardContent>
            </Card>

            {/* D) Brand Toolkit */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Brand Toolkit
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                        Create Retail Outreach Playbook
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                        Create Launch Playbook
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                        Create Winback Playbook
                    </Button>
                </CardContent>
            </Card>

            {/* E) Ezal Lite - Competitive Intel */}
            <EzalSnapshotCard userState={userState} compact />
        </div>
    );
}
