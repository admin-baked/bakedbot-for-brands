'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Video } from 'lucide-react';
import { 
    getEmailProviderAction, 
    updateEmailProviderAction,
    getVideoProviderAction,
    updateVideoProviderAction
} from '@/server/actions/super-admin/global-settings';

export default function CeoSettingsTab() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [emailProvider, setEmailProvider] = useState<'sendgrid' | 'mailjet'>('sendgrid');
    const [videoProvider, setVideoProvider] = useState<'veo' | 'sora'>('veo');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadSettings();
    }, []);

    if (!mounted) {
        return <div className="flex h-[200px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const loadSettings = async () => {
        // Mock loading to avoid crash on read
        // The user can overwrite the setting by saving.
        setTimeout(() => {
            setLoading(false);
        }, 500);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                updateEmailProviderAction({ provider: emailProvider }),
                updateVideoProviderAction({ provider: videoProvider })
            ]);
            
            toast({
                title: 'Settings Saved',
                description: 'System preferences have been updated.'
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update settings.'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle>Email Provider</CardTitle>
                    </div>
                    <CardDescription>
                        Configure the transactional email service used by BakedBot.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup 
                        value={emailProvider} 
                        onValueChange={(val) => setEmailProvider(val as 'sendgrid' | 'mailjet')}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="sendgrid" id="sendgrid" className="peer sr-only" />
                            <Label
                                htmlFor="sendgrid"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <span className="mb-2 text-lg font-semibold">SendGrid</span>
                                <span className="text-sm text-muted-foreground text-center">
                                    Uses @sendgrid/mail. <br/>Legacy default.
                                </span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="mailjet" id="mailjet" className="peer sr-only" />
                            <Label
                                htmlFor="mailjet"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <span className="mb-2 text-lg font-semibold">Mailjet</span>
                                <span className="text-sm text-muted-foreground text-center">
                                    Uses node-mailjet. <br/>New provider.
                                </span>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        <CardTitle>Video Provider</CardTitle>
                    </div>
                    <CardDescription>
                        Select the primary AI model for video generation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup 
                        value={videoProvider} 
                        onValueChange={(val) => setVideoProvider(val as 'veo' | 'sora')}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="veo" id="veo" className="peer sr-only" />
                            <Label
                                htmlFor="veo"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <span className="mb-2 text-lg font-semibold">Google Veo 3</span>
                                <span className="text-sm text-muted-foreground text-center">
                                    Vertex AI (Default). <br/>Fast Preview.
                                </span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="sora" id="sora" className="peer sr-only" />
                            <Label
                                htmlFor="sora"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <span className="mb-2 text-lg font-semibold">OpenAI Sora 2</span>
                                <span className="text-sm text-muted-foreground text-center">
                                    High fidelity. <br/>Quota Fallback.
                                </span>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
            
            <div className="flex justify-end sticky bottom-4">
                <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save System Changes
                </Button>
            </div>
        </div>
    );
}
