'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Zap,
    ArrowRight,
    AlertCircle,
    TrendingUp,
    MapPin,
    Package
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function NextBestActions() {
    const actions = [
        {
            id: '1',
            title: 'Fix Price Parity',
            description: '3 retailers in IL are pricing your top SKU below MAP. Correct them immediately.',
            priority: 'high',
            type: 'compliance',
            icon: AlertCircle,
            cta: 'View Retailers'
        },
        {
            id: '2',
            title: 'Expand to Detroit',
            description: 'Top competitor just gained 5 doors in MI. Run Detroit Coverage playbook.',
            priority: 'medium',
            type: 'growth',
            icon: TrendingUp,
            cta: 'Run Playbook'
        },
        {
            id: '3',
            title: 'OOS Warning',
            description: 'Warehouse stock for "Premium Flower" is low. Sync supply with 12 active doors.',
            priority: 'high',
            type: 'inventory',
            icon: Package,
            cta: 'View Stock'
        }
    ];

    return (
        <Card className="h-full border-emerald-100 bg-emerald-50/10">
            <CardHeader className="pb-2 border-b border-emerald-50 bg-emerald-50/20">
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-sm font-bold text-emerald-900 tracking-tight uppercase">
                        Next Best Actions
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
                {actions.map((action) => (
                    <div key={action.id} className="group relative p-3 rounded-lg bg-white border border-emerald-100 shadow-sm hover:border-emerald-300 transition-all">
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-md ${action.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                <action.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold leading-none">{action.title}</h4>
                                    <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter h-4 px-1 ${action.priority === 'high' ? 'border-red-200 text-red-600' : 'border-blue-200 text-blue-600'
                                        }`}>
                                        {action.priority}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {action.description}
                                </p>
                                <div className="pt-1">
                                    <Button variant="ghost" size="sm" className="h-6 px-0 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-transparent gap-1">
                                        {action.cta} <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
