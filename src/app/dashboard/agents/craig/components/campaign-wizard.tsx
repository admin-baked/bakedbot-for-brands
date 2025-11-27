
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, ChevronRight, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type WizardStep = 'goal' | 'audience' | 'content' | 'review';

export default function CampaignWizard() {
    const [step, setStep] = useState<WizardStep>('goal');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        goal: '',
        audience: '',
        channel: 'email',
        content: '',
        subject: '',
    });

    const handleNext = () => {
        if (step === 'goal') setStep('audience');
        else if (step === 'audience') setStep('content');
        else if (step === 'content') setStep('review');
    };

    const handleBack = () => {
        if (step === 'audience') setStep('goal');
        else if (step === 'content') setStep('audience');
        else if (step === 'review') setStep('content');
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast({
            title: "Campaign Scheduled!",
            description: "Craig will handle the rest.",
        });

        setIsLoading(false);
        router.push('/dashboard/agents/craig');
    };

    const handleGenerateContent = async () => {
        setIsLoading(true);
        // Simulate AI generation
        await new Promise(resolve => setTimeout(resolve, 1500));

        setFormData(prev => ({
            ...prev,
            subject: `Exclusive Offer for our ${formData.audience} customers!`,
            content: `Hi there,\n\nWe noticed you haven't visited in a while. We miss you! Come back and enjoy 20% off your next purchase.\n\nBest,\nThe Team`,
        }));

        setIsLoading(false);
    };

    return (
        <div className="max-w-3xl mx-auto h-full flex flex-col">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8 px-4">
                {['Goal', 'Audience', 'Content', 'Review'].map((s, i) => {
                    const stepKey = s.toLowerCase() as WizardStep;
                    const isActive = step === stepKey;
                    const isCompleted =
                        (step === 'audience' && i === 0) ||
                        (step === 'content' && i <= 1) ||
                        (step === 'review' && i <= 2);

                    return (
                        <div key={s} className="flex flex-col items-center gap-2">
                            <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2
                        ${isActive ? 'border-primary bg-primary text-primary-foreground' :
                                    isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground text-muted-foreground'}
                    `}>
                                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={`text-xs ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}>{s}</span>
                        </div>
                    )
                })}
            </div>

            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>
                        {step === 'goal' && "What's the goal of this campaign?"}
                        {step === 'audience' && "Who are we targeting?"}
                        {step === 'content' && "Let's create the content"}
                        {step === 'review' && "Review & Schedule"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto">
                    {step === 'goal' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Campaign Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Summer Sale 2025"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="goal">Objective</Label>
                                <Select
                                    value={formData.goal}
                                    onValueChange={(val) => setFormData({ ...formData, goal: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a goal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sales">Drive Sales</SelectItem>
                                        <SelectItem value="awareness">Brand Awareness</SelectItem>
                                        <SelectItem value="loyalty">Customer Loyalty</SelectItem>
                                        <SelectItem value="event">Event Promotion</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {step === 'audience' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="audience">Target Audience</Label>
                                <Select
                                    value={formData.audience}
                                    onValueChange={(val) => setFormData({ ...formData, audience: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an audience segment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Customers</SelectItem>
                                        <SelectItem value="loyal">Loyal Customers (3+ orders)</SelectItem>
                                        <SelectItem value="churned">At Risk (No order in 30 days)</SelectItem>
                                        <SelectItem value="new">New Signups</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="channel">Channel</Label>
                                <Select
                                    value={formData.channel}
                                    onValueChange={(val) => setFormData({ ...formData, channel: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a channel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="sms">SMS (Coming Soon)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {step === 'content' && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateContent}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate with Craig
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject Line</Label>
                                <Input
                                    id="subject"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Enter email subject"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="content">Email Body</Label>
                                <Textarea
                                    id="content"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Write your email content here..."
                                    className="min-h-[200px]"
                                />
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Campaign Name</p>
                                    <p>{formData.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Goal</p>
                                    <p className="capitalize">{formData.goal}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Audience</p>
                                    <p className="capitalize">{formData.audience}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Channel</p>
                                    <p className="capitalize">{formData.channel}</p>
                                </div>
                            </div>

                            <div className="border rounded-md p-4 bg-muted/50">
                                <p className="font-semibold mb-2">Preview:</p>
                                <p className="text-sm font-medium mb-1">Subject: {formData.subject}</p>
                                <div className="text-sm whitespace-pre-wrap bg-background p-3 rounded border">
                                    {formData.content}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between border-t p-6">
                    <Button variant="outline" onClick={handleBack} disabled={step === 'goal' || isLoading}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>

                    {step === 'review' ? (
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Schedule Campaign
                        </Button>
                    ) : (
                        <Button onClick={handleNext}>
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
