'use client';

/**
 * Inline Campaign Planner
 *
 * AI-powered multi-channel campaign planner.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Sparkles, Wand2, Check, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CampaignPlannerInlineProps {
    onComplete?: (campaignData: any) => void;
    initialPrompt?: string;
    className?: string;
}

export function CampaignPlannerInline({
    onComplete,
    initialPrompt = '',
    className
}: CampaignPlannerInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [campaignPlan, setCampaignPlan] = useState<any | null>(null);
    const { toast } = useToast();

    const generateCampaign = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setCampaignPlan({
                name: "Multi-Channel Promo",
                goal: "Drive foot traffic this weekend",
                channels: ["Email", "SMS", "Instagram"],
                schedule: "Launch Friday 4 PM, Reminder Saturday 10 AM",
                summary: "A high-urgency campaign targeting your local VIP segment with a weekend-only exclusive offer.",
            });
            toast({ title: "Campaign Planned!" });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('w-full my-2', className)}
        >
            <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
                            <Megaphone className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Campaign Planner</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Draft a multi-channel campaign in seconds
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-orange-400" />
                                What's the goal of this campaign?
                            </Label>
                            <Textarea
                                placeholder="E.g., I want to run a 20% off sale on all edibles this weekend."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                            />
                        </div>
                        <Button
                            onClick={generateCampaign}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            {campaignPlan ? 'Regenerate Plan' : 'Plan Campaign'}
                        </Button>
                    </div>

                    {campaignPlan && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <Card className="border-orange-500/20 bg-orange-500/5">
                                <CardContent className="space-y-4 pt-4 text-sm">
                                    <h4 className="font-semibold text-orange-400 text-lg">{campaignPlan.name}</h4>
                                    <p className="text-muted-foreground">{campaignPlan.summary}</p>
                                    <div className="flex items-center gap-2 text-orange-300">
                                        <Calendar className="h-4 w-4" />
                                        <span>{campaignPlan.schedule}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {campaignPlan.channels.map((c: string) => (
                                            <span key={c} className="px-2 py-1 bg-background/50 rounded-md text-xs">{c}</span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button onClick={() => onComplete?.(campaignPlan)} className="bg-gradient-to-r from-orange-500 to-red-500">
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve & Build
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
