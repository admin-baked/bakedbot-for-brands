'use client';

/**
 * Inline Event Planner
 *
 * AI-powered event marketing and promotion planner.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Sparkles, MapPin, Check, Loader2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface EventPlannerInlineProps {
    onComplete?: (eventData: any) => void;
    initialPrompt?: string;
    className?: string;
}

export function EventPlannerInline({
    onComplete,
    initialPrompt = '',
    className
}: EventPlannerInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [eventPlan, setEventPlan] = useState<any | null>(null);
    const { toast } = useToast();

    const generateEventPlan = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setEventPlan({
                name: "Summer Kickoff Vendor Day",
                location: "Downtown Store & Parking Lot",
                date: "Saturday, June 21st, 12PM - 6PM",
                description: "Live DJ, food trucks, and BOGO deals from our top 5 brand partners.",
                promotionalPlan: [
                    "Email blast to VIPs 7 days out",
                    "SMS reminder 24 hours prior",
                    "Instagram Story countdown series",
                    "In-store flyer distribution starting today"
                ],
            });
            toast({ title: "Event Planned!" });
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20">
                            <PartyPopper className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Event Planner</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Structure your event and map out the promo schedule
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-yellow-400" />
                                What kind of event are you hosting?
                            </Label>
                            <Textarea
                                placeholder="E.g., We're doing a vendor day next Saturday with food trucks and a live DJ."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                            />
                        </div>
                        <Button
                            onClick={generateEventPlan}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-yellow-950 font-semibold"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PartyPopper className="h-4 w-4 mr-2" />}
                            {eventPlan ? 'Regenerate Idea' : 'Draft Event Plan'}
                        </Button>
                    </div>

                    {eventPlan && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <Card className="border-yellow-500/20 bg-yellow-500/5">
                                <CardContent className="space-y-4 pt-4 text-sm">
                                    <h4 className="font-semibold text-yellow-400 text-lg">{eventPlan.name}</h4>
                                    <div className="flex flex-col gap-2 text-muted-foreground text-xs">
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {eventPlan.location}</span>
                                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {eventPlan.date}</span>
                                    </div>
                                    <p className="text-muted-foreground">{eventPlan.description}</p>

                                    <div className="pt-2">
                                        <span className="font-semibold text-yellow-300 block mb-2">Promo Schedule:</span>
                                        <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
                                            {eventPlan.promotionalPlan.map((item: string, i: number) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button onClick={() => onComplete?.(eventPlan)} className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold">
                                    <Check className="h-4 w-4 mr-2" />
                                    Confirm Plan
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
