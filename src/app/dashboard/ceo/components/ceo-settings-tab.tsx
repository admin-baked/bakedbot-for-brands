'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { getEmailProviderAction, updateEmailProviderAction } from '@/server/actions/super-admin/settings';

export default function CeoSettingsTab() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [provider, setProvider] = useState<'sendgrid' | 'mailjet'>('sendgrid');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadSettings();
    }, []);

    if (!mounted) {
        return <div className="flex h-[200px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const loadSettings = async () => {
        try {
            const current = await getEmailProviderAction();
            setProvider(current as 'sendgrid' | 'mailjet');
        } catch (error) {
            console.error('Failed to load email settings:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load system settings.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateEmailProviderAction({ provider });
            toast({
                title: 'Settings Saved',
                description: `Email provider updated to ${provider === 'mailjet' ? 'Mailjet' : 'SendGrid'}.`
            });
        } catch (error) {
            console.error('Failed to save email settings:', error);
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
                <CardContent className="space-y-6">
                    <RadioGroup 
                        value={provider} 
                        onValueChange={(val) => setProvider(val as 'sendgrid' | 'mailjet')}
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

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
