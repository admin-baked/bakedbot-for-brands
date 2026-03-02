'use client';

/**
 * Inline Performance Review
 *
 * AI-powered data analysis and performance optimization inline primitive.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, BarChart3, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PerformanceReviewInlineProps {
    onComplete?: (report: any) => void;
    initialPrompt?: string;
    className?: string;
}

export function PerformanceReviewInline({
    onComplete,
    initialPrompt = '',
    className
}: PerformanceReviewInlineProps) {
    const [aiPrompt, setAiPrompt] = useState(initialPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [report, setReport] = useState<any | null>(null);
    const { toast } = useToast();

    const generateReport = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setReport({
                insight: "Your top selling category is Flower, but Pre-rolls have the highest margin.",
                recommendation: "Increase bundle promotions combining Flower + Pre-rolls to lift Average Order Value.",
                metric: "+12% AOV Potential",
            });
            toast({ title: "Performance Analyzed!" });
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
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">AI Performance Review</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Analyze data and get optimization suggestions
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-emerald-400" />
                                What would you like to analyze?
                            </Label>
                            <Textarea
                                placeholder="E.g., How did our weekend sale perform compared to last month?"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="bg-background/50 border-white/10 min-h-[100px]"
                            />
                        </div>
                        <Button
                            onClick={generateReport}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            {report ? 'Run New Analysis' : 'Analyze Performance'}
                        </Button>
                    </div>

                    {report && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <Card className="border-emerald-500/20 bg-emerald-500/5">
                                <CardContent className="space-y-4 pt-4 text-sm">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-emerald-400 text-lg">Key Insight</h4>
                                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded font-mono text-xs">{report.metric}</span>
                                    </div>
                                    <p className="text-muted-foreground">{report.insight}</p>
                                    <div className="p-3 bg-background/50 rounded border border-emerald-500/20">
                                        <span className="font-semibold text-emerald-300 block mb-1">Recommendation:</span>
                                        {report.recommendation}
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button onClick={() => onComplete?.(report)} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                                    <Check className="h-4 w-4 mr-2" />
                                    Acknowledge
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
