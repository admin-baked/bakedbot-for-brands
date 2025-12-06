'use client';

import { ShieldCheck, AlertTriangle, AlertOctagon, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export type ComplianceResult = {
    score: number;
    violations: string[]; // List of rule descriptions or keywords
    status: 'pass' | 'warning' | 'fail';
};

interface ComplianceBadgeProps {
    result: ComplianceResult | null;
    isLoading: boolean;
}

export function ComplianceBadge({ result, isLoading }: ComplianceBadgeProps) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground text-sm p-4 border rounded-md bg-muted/20">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Deebo is inspecting content...</span>
            </div>
        );
    }

    if (!result) return null;

    let icon = <ShieldCheck className="h-5 w-5 text-green-600" />;
    let title = "Compliance Verified";
    let colorClass = "bg-green-50 border-green-200 text-green-800";
    let iconClass = "text-green-600";

    if (result.status === 'fail') {
        icon = <AlertOctagon className="h-5 w-5 text-destructive" />;
        title = "Compliance Violation";
        colorClass = "bg-red-50 border-red-200 text-red-800";
        iconClass = "text-destructive";
    } else if (result.status === 'warning') {
        icon = <AlertTriangle className="h-5 w-5 text-yellow-600" />;
        title = "Compliance Warning";
        colorClass = "bg-yellow-50 border-yellow-200 text-yellow-800";
        iconClass = "text-yellow-600";
    }

    return (
        <div className={`rounded-md border p-4 ${colorClass}`}>
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${iconClass}`}>{icon}</div>
                <div className="flex-1">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                        {title}
                        {result.score < 100 && <Badge variant="outline" className="ml-2 bg-white/50">{result.score}% Score</Badge>}
                    </h4>

                    {result.violations.length === 0 ? (
                        <p className="text-xs mt-1 opacity-90">No flagged terms found in this content.</p>
                    ) : (
                        <div className="mt-2">
                            <p className="text-xs font-medium mb-1">Issues Found:</p>
                            <ul className="list-disc list-inside text-xs space-y-1">
                                {result.violations.map((v, i) => (
                                    <li key={i}>{v}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
