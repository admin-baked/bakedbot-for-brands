'use client';

/**
 * AI Settings Tab
 *
 * Allows users to configure custom AI instructions similar to ChatGPT/Claude.
 * Supports both tenant-level (org admin) and user-level preferences.
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Sparkles, Building2, User, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { useUserRole } from '@/hooks/use-user-role';
import {
    getMyAISettings,
    getMyTenantAISettings,
    saveUserAISettings,
    saveTenantAISettings,
} from '@/server/actions/ai-settings';
import type { TenantAISettings, UserAISettings } from '@/types/ai-settings';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AISettingsTab() {
    const { user } = useUser();
    const { isSuperUser, hasBrandAdminAccess, hasDispensaryAdminAccess } = useUserRole();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // User settings
    const [userInstructions, setUserInstructions] = useState('');
    const [preferredTone, setPreferredTone] = useState<string>('');
    const [responseFormat, setResponseFormat] = useState('auto');
    const [experienceLevel, setExperienceLevel] = useState('intermediate');
    const [simpleLanguage, setSimpleLanguage] = useState(false);
    const [avoidJargon, setAvoidJargon] = useState(false);

    // Tenant settings (only for admins)
    const [tenantInstructions, setTenantInstructions] = useState('');
    const [tenantTone, setTenantTone] = useState('friendly');
    const [businessContext, setBusinessContext] = useState('');
    const [alwaysMention, setAlwaysMention] = useState('');
    const [avoidTopics, setAvoidTopics] = useState('');
    const [tenantId, setTenantId] = useState<string | null>(null);

    const canEditTenantSettings = isSuperUser || hasBrandAdminAccess || hasDispensaryAdminAccess;

    useEffect(() => {
        loadSettings();
    }, [user]);

    async function loadSettings() {
        if (!user) return;
        setLoading(true);

        try {
            // Load user settings
            const userSettings = await getMyAISettings();
            setUserInstructions(userSettings.customInstructions || '');
            setPreferredTone(userSettings.preferredTone || '');
            setResponseFormat(userSettings.responseFormat || 'auto');
            setExperienceLevel(userSettings.experienceLevel || 'intermediate');
            setSimpleLanguage(userSettings.accessibility?.simpleLanguage || false);
            setAvoidJargon(userSettings.accessibility?.avoidJargon || false);

            // Load tenant settings if admin
            if (canEditTenantSettings) {
                const tenantSettings = await getMyTenantAISettings();
                if (tenantSettings) {
                    setTenantInstructions(tenantSettings.customInstructions || '');
                    setTenantTone(tenantSettings.tone || 'friendly');
                    setBusinessContext(tenantSettings.businessContext || '');
                    setAlwaysMention(tenantSettings.alwaysMention?.join(', ') || '');
                    setAvoidTopics(tenantSettings.avoidTopics?.join(', ') || '');
                }

                // Get tenant ID
                const profile = user as any;
                setTenantId(profile?.brandId || profile?.locationId || profile?.orgId || null);
            }
        } catch (error) {
            console.error('Failed to load AI settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to load AI settings',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveUserSettings() {
        setSaving(true);
        try {
            const result = await saveUserAISettings({
                customInstructions: userInstructions,
                preferredTone: preferredTone as any || undefined,
                responseFormat: responseFormat as any,
                experienceLevel: experienceLevel as any,
                accessibility: {
                    simpleLanguage,
                    avoidJargon,
                    largerText: false,
                },
            });

            if (result.success) {
                toast({
                    title: 'Saved',
                    description: 'Your AI preferences have been updated.',
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save settings',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveTenantSettings() {
        if (!tenantId) return;

        setSaving(true);
        try {
            const result = await saveTenantAISettings(tenantId, {
                customInstructions: tenantInstructions,
                tone: tenantTone as any,
                businessContext,
                alwaysMention: alwaysMention.split(',').map(s => s.trim()).filter(Boolean),
                avoidTopics: avoidTopics.split(',').map(s => s.trim()).filter(Boolean),
            });

            if (result.success) {
                toast({
                    title: 'Saved',
                    description: 'Organization AI settings have been updated.',
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save organization settings',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info Alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    Custom instructions let you personalize how AI agents respond to you.
                    Similar to ChatGPT&apos;s custom instructions or Claude&apos;s project settings.
                </AlertDescription>
            </Alert>

            {/* User Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Your AI Preferences
                    </CardTitle>
                    <CardDescription>
                        Personal settings that apply to your account across all agents.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="user-instructions">Custom Instructions</Label>
                        <Textarea
                            id="user-instructions"
                            placeholder="Tell the AI about yourself and how you'd like it to respond. Example: 'I'm new to cannabis - explain things simply and avoid jargon.'"
                            value={userInstructions}
                            onChange={(e) => setUserInstructions(e.target.value)}
                            rows={4}
                            maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground">
                            {userInstructions.length}/1000 characters
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Preferred Tone</Label>
                            <Select value={preferredTone} onValueChange={setPreferredTone}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Use org default" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Use org default</SelectItem>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                    <SelectItem value="friendly">Friendly</SelectItem>
                                    <SelectItem value="formal">Formal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Response Format</Label>
                            <Select value={responseFormat} onValueChange={setResponseFormat}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="paragraphs">Paragraphs</SelectItem>
                                    <SelectItem value="bullets">Bullet Points</SelectItem>
                                    <SelectItem value="numbered">Numbered Lists</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Experience Level</Label>
                            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="experienced">Experienced</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-base">Accessibility</Label>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="simple-language">Use simple language</Label>
                                <p className="text-xs text-muted-foreground">
                                    Easier to understand responses
                                </p>
                            </div>
                            <Switch
                                id="simple-language"
                                checked={simpleLanguage}
                                onCheckedChange={setSimpleLanguage}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="avoid-jargon">Avoid industry jargon</Label>
                                <p className="text-xs text-muted-foreground">
                                    Skip technical cannabis terms
                                </p>
                            </div>
                            <Switch
                                id="avoid-jargon"
                                checked={avoidJargon}
                                onCheckedChange={setAvoidJargon}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveUserSettings} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Preferences
                    </Button>
                </CardFooter>
            </Card>

            {/* Organization Settings (Admin Only) */}
            {canEditTenantSettings && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Organization AI Settings
                        </CardTitle>
                        <CardDescription>
                            These settings apply to all users in your organization.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tenant-instructions">Organization Instructions</Label>
                            <Textarea
                                id="tenant-instructions"
                                placeholder="Instructions for all agents when interacting with your team. Example: 'Always mention our loyalty program. Focus on community impact.'"
                                value={tenantInstructions}
                                onChange={(e) => setTenantInstructions(e.target.value)}
                                rows={4}
                                maxLength={2000}
                            />
                            <p className="text-xs text-muted-foreground">
                                {tenantInstructions.length}/2000 characters
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="business-context">Business Context</Label>
                            <Textarea
                                id="business-context"
                                placeholder="Brief description of your business for AI context. Example: 'Family-owned dispensary since 2023. Focus on medical patients and education.'"
                                value={businessContext}
                                onChange={(e) => setBusinessContext(e.target.value)}
                                rows={3}
                                maxLength={1000}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Default Tone</Label>
                                <Select value={tenantTone} onValueChange={setTenantTone}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="casual">Casual</SelectItem>
                                        <SelectItem value="friendly">Friendly</SelectItem>
                                        <SelectItem value="formal">Formal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="always-mention">Always Mention (comma-separated)</Label>
                            <Textarea
                                id="always-mention"
                                placeholder="loyalty program, community focus, veteran discount"
                                value={alwaysMention}
                                onChange={(e) => setAlwaysMention(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="avoid-topics">Topics to Avoid (comma-separated)</Label>
                            <Textarea
                                id="avoid-topics"
                                placeholder="competitor names, pricing specifics"
                                value={avoidTopics}
                                onChange={(e) => setAvoidTopics(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveTenantSettings} disabled={saving || !tenantId}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Organization Settings
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
