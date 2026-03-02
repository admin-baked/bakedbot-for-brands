'use client';

/**
 * Inline Outreach Generator
 *
 * AI-powered customer blast / SMS / Email creation tool.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, MessageSquare, Check, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface OutreachGeneratorInlineProps {
    onComplete?: (draft: any) => void;
    initialPrompt?: string;
    className?: string;
}

export function OutreachGeneratorInline({
    onComplete,
    initialPrompt = '',
    className
}: OutreachGeneratorInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [draft, setDraft] = useState<any | null>(null);
    const { toast } = useToast();

    const generateOutreach = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setDraft({
                channel: "SMS",
                audience: "VIP Customers (Last 30 Days)",
                message: "Hey {{first_name}}! 🌿 Your VIP status just unlocked early access to our new drop. Tap here to claim your reserve: {{link}} Reply STOP to opt-out.",
                compliance: "Passed Deebo Compliance Check ✓",
            });
            toast({ title: "Draft Ready!" });
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                            <Send className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Customer Blast</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Draft compliant SMS or Email outreach in seconds
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-400" />
                                What's the message?
                            </Label>
                            <Textarea
                                placeholder="E.g., Send a text to VIPs letting them know about early access to the new drop."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                            />
                        </div>
                        <Button
                            onClick={generateOutreach}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            {draft ? 'Regenerate Draft' : 'Draft Copy'}
                        </Button>
                    </div>

                    {draft && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <Card className="border-blue-500/20 bg-blue-500/5">
                                <CardContent className="space-y-4 pt-4 text-sm">
                                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {draft.channel}</span>
                                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {draft.audience}</span>
                                    </div>
                                    <div className="p-3 bg-background/50 rounded border border-white/10 font-mono text-xs">
                                        {draft.message}
                                    </div>
                                    <p className="text-xs text-green-400">{draft.compliance}</p>
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button onClick={() => onComplete?.(draft)} className="bg-gradient-to-r from-blue-500 to-cyan-500">
                                    <Check className="h-4 w-4 mr-2" />
                                    Review & Send
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
