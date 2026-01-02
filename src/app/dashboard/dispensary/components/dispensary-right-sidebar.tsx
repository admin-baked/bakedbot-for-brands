'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Zap,
    Users,
    TrendingUp,
    ShieldAlert,
    Clock,
    Plus,
    Search,
    BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EzalSnapshotCard } from '@/components/dashboard/ezal-snapshot-card';

interface DispensaryRightRailProps {
    userState?: string;
}

export function DispensaryRightRail({ userState = 'Michigan' }: DispensaryRightRailProps) {
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
                        Active Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="font-medium">3 products near OOS</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>2 promos blocked by compliance</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span>Menu sync delayed (POS)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>No critical errors</span>
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
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Publish Menu')}>
                        <FileText className="h-3 w-3 mr-2" />
                        Publish Menu
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Run Compliance Scan')}>
                        <ShieldAlert className="h-3 w-3 mr-2" />
                        Run Compliance Scan
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Launch Compliant Promo')}>
                        <Zap className="h-3 w-3 mr-2" />
                        Launch Compliant Promo
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleAction('Run Competitor Scan')}>
                        <Search className="h-3 w-3 mr-2" />
                        Run Competitor Scan
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
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Sales</span>
                        <span className="text-xs font-medium">Smokey</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-2 flex flex-col gap-1 items-start border bg-muted/20">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Marketing</span>
                        <span className="text-xs font-medium">Craig</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-2 flex flex-col gap-1 items-start border bg-muted/20">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Intel</span>
                        <span className="text-xs font-medium">Ezal</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-2 flex flex-col gap-1 items-start border bg-muted/20">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Compliance</span>
                        <span className="text-xs font-medium">Deebo</span>
                    </Button>
                </CardContent>
            </Card>

            {/* D) Playbook Templates */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4 text-primary" />
                        Create Playbook
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                        Create Promo Playbook
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                        Create Inventory Alert
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
                        Create Loyalty Winback
                    </Button>
                </CardContent>
            </Card>

            {/* E) Ezal Lite - Competitive Intel */}
            <EzalSnapshotCard userState={userState} compact />
        </div>
    );
}
