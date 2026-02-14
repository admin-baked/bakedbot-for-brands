// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Send, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auditContent } from '@/app/dashboard/compliance/actions';
import { ComplianceBadge, ComplianceResult } from '../../components/compliance-badge';

type CampaignContent = {
    subjectLines: string[];
    emailBody: string;
    previewText: string;
    suggestedSegment: string;
};

export default function NewCampaignPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [goal, setGoal] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('');
    const [generatedContent, setGeneratedContent] = useState<CampaignContent | null>(null);
    const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
    const { toast } = useToast();

    const handleGenerate = async () => {
        if (!goal) {
            toast({ variant: 'destructive', title: 'Goal Required', description: 'Please briefly describe the goal of this campaign.' });
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/marketing/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, audience, tone }),
            });

            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            setGeneratedContent(data.content);

            // Compliance Check
            const auditResult = await auditContent(data.content.emailBody, 'CA'); // Default to CA for demo

            const result = {
                score: auditResult.score,
                violations: auditResult.violations.map(v => `${v.description}: ${v.reason}`),
                status: auditResult.passed ? 'pass' as const : (auditResult.score > 80 ? 'warning' as const : 'fail' as const)
            };
            setComplianceResult(result);

            toast({ title: 'Campaign Generated!', description: 'Craig has drafted your email.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate campaign content.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
        if (complianceResult?.status === 'fail') {
            toast({ variant: 'destructive', title: 'Compliance Violation', description: 'Please resolve critical issues before sending.' });
            return;
        }
        toast({ title: 'Sent! (Simulation)', description: 'This campaign would have been sent to your list.' });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-6">
                <Link href="/dashboard/marketing" className="flex items-center text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Marketing
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Input */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">New Campaign</h1>
                        <p className="text-muted-foreground">Brief Craig on what you want to achieve, and he'll handle the rest.</p>
                    </div>

                    <Card className="border-primary/20 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Campaign Brief
                            </CardTitle>
                            <CardDescription>Tell Craig what to write.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="goal">Campaign Goal</Label>
                                <Textarea
                                    id="goal"
                                    placeholder="e.g. Promote our new 4/20 specials and drive traffic to the store."
                                    className="h-24"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="audience">Target Audience (Optional)</Label>
                                <Input
                                    id="audience"
                                    placeholder="e.g. Loyal customers, Lapse customers..."
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tone">Tone (Optional)</Label>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a tone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="friendly">Friendly & Warm</SelectItem>
                                        <SelectItem value="urgent">Urgent / Hype</SelectItem>
                                        <SelectItem value="educational">Educational</SelectItem>
                                        <SelectItem value="humorous">Humorous / Witty</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleGenerate} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Craig is writing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate with Craig
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: Preview */}
                <div className="space-y-6">
                    {generatedContent ? (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-6">
                            <ComplianceBadge result={complianceResult} isLoading={false} />

                            <Card>
                                <CardHeader>
                                    <CardTitle>Generated Content</CardTitle>
                                    <CardDescription>Review and edit before sending.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Subject Line Options</Label>
                                        <div className="space-y-2">
                                            {generatedContent.subjectLines.map((subject, i) => (
                                                <div key={i} className="p-3 bg-muted rounded-md text-sm border hover:border-primary cursor-pointer transition-colors">
                                                    {subject}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Preview Text</Label>
                                        <div className="p-2 bg-muted/50 rounded-md text-sm italic text-muted-foreground">
                                            {generatedContent.previewText}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Preview</Label>
                                        <div className="border rounded-md p-4 bg-white text-black min-h-[300px] prose prose-sm max-w-none shadow-inner overflow-auto h-[400px]">
                                            <div dangerouslySetInnerHTML={{ __html: generatedContent.emailBody }} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Recommended Segment</Label>
                                        <p className="text-sm text-muted-foreground">{generatedContent.suggestedSegment}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={handleGenerate} disabled={isLoading}>
                                        <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                                    </Button>
                                    <Button className="flex-1" onClick={handleSend}>
                                        <Send className="mr-2 h-4 w-4" /> Review & Send
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground bg-muted/20">
                            <div>
                                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-medium mb-2">Ready to create</h3>
                                <p className="max-w-xs mx-auto">Fill out the brief on the left and Craig will generate your campaign instantly.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
