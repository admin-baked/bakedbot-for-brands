'use client';

/**
 * Public Vibe Studio
 *
 * Lead magnet page allowing anyone to generate AI-powered menu themes.
 * No authentication required - captures email when user wants to save or hits usage limit.
 *
 * Features:
 * - Web vibe generation (3 free generations)
 * - Mobile vibe generation (requires email)
 * - Preset templates for quick starts
 * - Share and refinement capabilities
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2,
    Sparkles,
    Wand2,
    Zap,
    Moon,
    Leaf,
    Flame,
    Sun,
    Share2,
    Save,
    RefreshCw,
    Check,
    Copy,
    Twitter,
    Linkedin,
    Mail,
    ArrowRight,
    Smartphone,
    Monitor,
    Lock,
    Link as LinkIcon,
    Upload,
    FileCode,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import {
    generatePublicVibe,
    createPublicVibeFromPreset,
    refinePublicVibe,
    saveVibeAndCaptureLead,
    trackVibeShare,
    generatePublicMobileVibe,
    createPublicMobileVibeFromPreset,
    saveMobileVibeAndCaptureLead,
    type PublicVibe,
    type PublicMobileVibe,
} from './actions';

import { VibePreview } from './vibe-preview';
import { generateVibeFromURL, generateVibeFromCSS, generateVibeFromWordPressTheme } from './clone-actions';

import {
    getUsageData,
    canGenerateVibe,
    recordVibeGeneration,
    recordEmailCapture,
    getRemainingVibes,
    hasProvidedEmail,
} from '@/lib/vibe-usage-tracker';

// Web preset cards
const WEB_PRESET_CARDS = [
    {
        key: 'modern-clean',
        name: 'Modern Clean',
        description: 'Professional and inviting',
        icon: Sun,
        gradient: 'from-green-500 to-emerald-600',
    },
    {
        key: 'dark-luxury',
        name: 'Dark Luxury',
        description: 'Premium and exclusive',
        icon: Moon,
        gradient: 'from-amber-500 to-yellow-600',
    },
    {
        key: 'cyberpunk',
        name: 'Cyberpunk',
        description: 'Neon and futuristic',
        icon: Zap,
        gradient: 'from-green-400 to-pink-500',
    },
    {
        key: 'organic-natural',
        name: 'Organic Natural',
        description: 'Earthy and authentic',
        icon: Leaf,
        gradient: 'from-green-600 to-amber-600',
    },
    {
        key: 'bold-street',
        name: 'Bold Street',
        description: 'Edgy and memorable',
        icon: Flame,
        gradient: 'from-red-500 to-yellow-500',
    },
];

// Mobile preset cards
const MOBILE_PRESET_CARDS = [
    {
        key: 'native-clean',
        name: 'Native Clean',
        description: 'Platform conventions',
        icon: Smartphone,
        gradient: 'from-blue-500 to-cyan-600',
    },
    {
        key: 'bold-branded',
        name: 'Bold Branded',
        description: 'Strong brand presence',
        icon: Flame,
        gradient: 'from-purple-500 to-pink-600',
    },
    {
        key: 'minimal-fast',
        name: 'Minimal Fast',
        description: 'Performance focused',
        icon: Zap,
        gradient: 'from-gray-500 to-slate-600',
    },
    {
        key: 'luxury-immersive',
        name: 'Luxury Immersive',
        description: 'Premium experience',
        icon: Moon,
        gradient: 'from-amber-500 to-orange-600',
    },
];

// Example prompts
const WEB_EXAMPLE_PROMPTS = [
    "Dark and moody with neon green accents. Think cyberpunk meets cannabis.",
    "Clean and clinical, like an Apple store for weed.",
    "Reggae beach vibes, Bob Marley would approve.",
];

const MOBILE_EXAMPLE_PROMPTS = [
    "Native iOS feel with clean typography and subtle haptics.",
    "Bold brand colors, full-screen product images, smooth animations.",
    "Fast and minimal - just the essentials, quick checkout.",
];

type VibeType = 'web' | 'mobile';
type CurrentVibe = PublicVibe | PublicMobileVibe | null;

export default function PublicVibePage() {
    const [vibeType, setVibeType] = useState<VibeType>('web');
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [currentVibe, setCurrentVibe] = useState<CurrentVibe>(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [refining, setRefining] = useState(false);

    // Clone from URL/file
    const [cloneUrl, setCloneUrl] = useState('');
    const [cloningFromUrl, setCloningFromUrl] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    // Usage tracking
    const [remaining, setRemaining] = useState(3);
    const [hasEmail, setHasEmail] = useState(false);

    // Email capture state
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailModalReason, setEmailModalReason] = useState<'save' | 'limit' | 'mobile'>('save');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Pending action after email capture
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Share state
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    const { toast } = useToast();

    // Initialize usage tracking
    useEffect(() => {
        setRemaining(getRemainingVibes());
        setHasEmail(hasProvidedEmail());
    }, []);

    const updateUsageState = () => {
        setRemaining(getRemainingVibes());
        setHasEmail(hasProvidedEmail());
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: 'Describe your vibe',
                description: 'Tell us what aesthetic you want.',
                variant: 'destructive',
            });
            return;
        }

        // Check if user can generate
        const check = canGenerateVibe(vibeType);
        if (!check.allowed) {
            if (check.reason === 'limit_reached') {
                setEmailModalReason('limit');
                setPendingAction(() => () => handleGenerate());
                setShowEmailModal(true);
                return;
            }
            if (check.reason === 'mobile_requires_email') {
                setEmailModalReason('mobile');
                setPendingAction(() => () => handleGenerate());
                setShowEmailModal(true);
                return;
            }
        }

        setGenerating(true);
        try {
            if (vibeType === 'web') {
                const result = await generatePublicVibe(prompt, 'balanced');
                if (result.success && result.data) {
                    setCurrentVibe(result.data);
                    recordVibeGeneration({
                        id: result.data.id,
                        name: result.data.config.name || 'Custom Vibe',
                        type: 'web',
                    });
                    updateUsageState();
                    toast({
                        title: 'Vibe Generated!',
                        description: result.data.reasoning || `Created "${result.data.config.name}"`,
                    });
                } else {
                    toast({
                        title: 'Generation Failed',
                        description: result.error || 'Please try again',
                        variant: 'destructive',
                    });
                }
            } else {
                const result = await generatePublicMobileVibe(prompt, 'both');
                if (result.success && result.data) {
                    setCurrentVibe(result.data);
                    recordVibeGeneration({
                        id: result.data.id,
                        name: result.data.config.name || 'Custom Mobile Vibe',
                        type: 'mobile',
                    });
                    updateUsageState();
                    toast({
                        title: 'Mobile Vibe Generated!',
                        description: result.data.reasoning || `Created "${result.data.config.name}"`,
                    });
                } else {
                    toast({
                        title: 'Generation Failed',
                        description: result.error || 'Please try again',
                        variant: 'destructive',
                    });
                }
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleCloneFromURL = async () => {
        if (!cloneUrl.trim()) {
            toast({
                title: 'Enter a URL',
                description: 'Provide a website URL to clone its design.',
                variant: 'destructive',
            });
            return;
        }

        // Check usage limits
        const check = canGenerateVibe('web');
        if (!check.allowed) {
            if (check.reason === 'limit_reached') {
                setEmailModalReason('limit');
                setPendingAction(() => () => handleCloneFromURL());
                setShowEmailModal(true);
                return;
            }
        }

        setCloningFromUrl(true);
        try {
            const result = await generateVibeFromURL(cloneUrl);
            if (result.success && result.data) {
                setCurrentVibe(result.data);
                recordVibeGeneration({
                    id: result.data.id,
                    name: result.data.config.name || 'Cloned Vibe',
                    type: 'web',
                });
                updateUsageState();
                toast({
                    title: 'Vibe Cloned!',
                    description: `Generated design from ${new URL(cloneUrl).hostname}`,
                });
            } else {
                toast({
                    title: 'Clone Failed',
                    description: result.error || 'Could not analyze website',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to clone website design',
                variant: 'destructive',
            });
        } finally {
            setCloningFromUrl(false);
        }
    };

    const handleFileUpload = async () => {
        if (!uploadedFile) {
            toast({
                title: 'Select a file',
                description: 'Upload a CSS file or WordPress theme .zip',
                variant: 'destructive',
            });
            return;
        }

        // Check usage limits
        const check = canGenerateVibe('web');
        if (!check.allowed) {
            if (check.reason === 'limit_reached') {
                setEmailModalReason('limit');
                setPendingAction(() => () => handleFileUpload());
                setShowEmailModal(true);
                return;
            }
        }

        setUploadingFile(true);
        try {
            let result;

            // Check file type
            if (uploadedFile.name.endsWith('.zip')) {
                // WordPress theme .zip file
                const arrayBuffer = await uploadedFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                result = await generateVibeFromWordPressTheme(buffer);
            } else if (uploadedFile.name.endsWith('.css')) {
                // CSS file
                const cssContent = await uploadedFile.text();
                result = await generateVibeFromCSS(cssContent, uploadedFile.name);
            } else {
                toast({
                    title: 'Invalid file type',
                    description: 'Please upload a .css or .zip file',
                    variant: 'destructive',
                });
                return;
            }

            if (result.success && result.data) {
                setCurrentVibe(result.data);
                recordVibeGeneration({
                    id: result.data.id,
                    name: result.data.config.name || 'Imported Theme',
                    type: 'web',
                });
                updateUsageState();
                toast({
                    title: 'Theme Imported!',
                    description: `Generated vibe from ${uploadedFile.name}`,
                });
            } else {
                toast({
                    title: 'Import Failed',
                    description: result.error || 'Could not parse theme file',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to import theme',
                variant: 'destructive',
            });
        } finally {
            setUploadingFile(false);
        }
    };

    const handlePresetSelect = async (presetKey: string) => {
        // Check usage limits
        const check = canGenerateVibe(vibeType);
        if (!check.allowed) {
            if (check.reason === 'limit_reached') {
                setEmailModalReason('limit');
                setPendingAction(() => () => handlePresetSelect(presetKey));
                setShowEmailModal(true);
                return;
            }
            if (check.reason === 'mobile_requires_email') {
                setEmailModalReason('mobile');
                setPendingAction(() => () => handlePresetSelect(presetKey));
                setShowEmailModal(true);
                return;
            }
        }

        setGenerating(true);
        try {
            if (vibeType === 'web') {
                const result = await createPublicVibeFromPreset(presetKey);
                if (result.success && result.data) {
                    setCurrentVibe(result.data);
                    recordVibeGeneration({
                        id: result.data.id,
                        name: result.data.config.name || presetKey,
                        type: 'web',
                    });
                    updateUsageState();
                    toast({ title: 'Preset Applied!' });
                }
            } else {
                const result = await createPublicMobileVibeFromPreset(presetKey, 'both');
                if (result.success && result.data) {
                    setCurrentVibe(result.data);
                    recordVibeGeneration({
                        id: result.data.id,
                        name: result.data.config.name || presetKey,
                        type: 'mobile',
                    });
                    updateUsageState();
                    toast({ title: 'Mobile Preset Applied!' });
                }
            }
        } catch (error) {
            toast({ title: 'Failed to apply preset', variant: 'destructive' });
        } finally {
            setGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!currentVibe || !refinementPrompt.trim()) return;
        if (currentVibe.type !== 'web') {
            toast({ title: 'Refinement only available for web vibes', variant: 'destructive' });
            return;
        }

        setRefining(true);
        try {
            const result = await refinePublicVibe(currentVibe.id, refinementPrompt);
            if (result.success && result.data) {
                setCurrentVibe(result.data);
                setRefinementPrompt('');
                toast({ title: 'Vibe Refined!' });
            } else {
                toast({ title: 'Refinement failed', description: result.error, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Failed to refine', variant: 'destructive' });
        } finally {
            setRefining(false);
        }
    };

    const handleSave = async () => {
        if (!currentVibe || !email.trim()) return;

        setSaving(true);
        try {
            let result;
            if (currentVibe.type === 'web') {
                result = await saveVibeAndCaptureLead(
                    currentVibe.id,
                    email,
                    phone || undefined,
                    marketingOptIn
                );
            } else {
                result = await saveMobileVibeAndCaptureLead(
                    currentVibe.id,
                    email,
                    phone || undefined,
                    marketingOptIn
                );
            }

            if (result.success && result.leadId) {
                recordEmailCapture(email, result.leadId);
                updateUsageState();
                setSaved(true);
                setShowEmailModal(false);
                toast({
                    title: 'Vibe Saved!',
                    description: "We'll send you a link to access your design.",
                });

                // Execute pending action if any
                if (pendingAction) {
                    setPendingAction(null);
                }
            } else {
                toast({ title: 'Failed to save', description: result.error, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error saving vibe', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleEmailSubmitForAccess = async () => {
        if (!email.trim()) return;

        setSaving(true);
        try {
            // Just record the email capture for access
            recordEmailCapture(email, 'pending');
            updateUsageState();
            setShowEmailModal(false);
            toast({
                title: 'Email Saved!',
                description: 'You now have unlimited access.',
            });

            // Execute pending action
            if (pendingAction) {
                const action = pendingAction;
                setPendingAction(null);
                action();
            }
        } catch (error) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy') => {
        if (!currentVibe) return;

        const shareUrl = `${window.location.origin}${currentVibe.previewUrl}`;
        const shareText = currentVibe.type === 'web'
            ? `Check out my AI-generated dispensary menu design! Made with BakedBot Vibe Studio.`
            : `Check out my AI-generated mobile app design! Made with BakedBot Vibe Studio.`;

        if (platform === 'copy') {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: 'Link copied!' });
        } else if (platform === 'twitter') {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        } else if (platform === 'linkedin') {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        } else if (platform === 'email') {
            window.location.href = `mailto:?subject=${encodeURIComponent('Check out my dispensary design!')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        }

        if (currentVibe.type === 'web') {
            await trackVibeShare(currentVibe.id, platform);
        }
        setShowShareMenu(false);
    };

    const startOver = () => {
        setCurrentVibe(null);
        setPrompt('');
        setSaved(false);
    };

    const getEmailModalTitle = () => {
        switch (emailModalReason) {
            case 'limit':
                return 'Unlock Unlimited Vibes';
            case 'mobile':
                return 'Mobile Vibes Require Email';
            case 'save':
            default:
                return 'Save Your Vibe';
        }
    };

    const getEmailModalDescription = () => {
        switch (emailModalReason) {
            case 'limit':
                return `You've used your ${3 - remaining} free vibes. Enter your email to continue generating unlimited designs.`;
            case 'mobile':
                return 'Mobile app designs are a premium feature. Enter your email to access mobile vibe generation.';
            case 'save':
            default:
                return "Enter your email and we'll send you a link to access your design anytime.";
        }
    };

    const presets = vibeType === 'web' ? WEB_PRESET_CARDS : MOBILE_PRESET_CARDS;
    const examplePrompts = vibeType === 'web' ? WEB_EXAMPLE_PROMPTS : MOBILE_EXAMPLE_PROMPTS;

    return (
        <div className="container mx-auto px-4 py-12">
            {/* Hero Section */}
            {!currentVibe && (
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <Badge variant="secondary" className="mb-4 gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI-Powered Design
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Design Your Dispensary<br />
                        <span className="text-primary">in 30 Seconds</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-4">
                        Describe your vibe and AI builds a stunning design. No signup required.
                    </p>
                    {!hasEmail && (
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{remaining}</span> free generations remaining
                        </p>
                    )}
                </div>
            )}

            {/* Generator Section */}
            {!currentVibe ? (
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Platform Tabs */}
                    <Tabs value={vibeType} onValueChange={(v) => setVibeType(v as VibeType)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                            <TabsTrigger value="web" className="gap-2">
                                <Monitor className="h-4 w-4" />
                                Web Menu
                            </TabsTrigger>
                            <TabsTrigger value="mobile" className="gap-2">
                                <Smartphone className="h-4 w-4" />
                                Mobile App
                                {!hasEmail && <Lock className="h-3 w-3 ml-1 opacity-50" />}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="web" className="mt-8">
                            {/* Main Input */}
                            <Card className="border-2 border-primary/20 shadow-lg">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wand2 className="h-5 w-5 text-primary" />
                                        <span className="font-semibold">Describe Your Web Vibe</span>
                                    </div>
                                    <Textarea
                                        placeholder="e.g., Dark and moody with neon green accents. Think cyberpunk meets cannabis. Products should glow on hover."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        rows={4}
                                        className="resize-none text-lg"
                                    />
                                    <Button
                                        size="lg"
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full gap-2"
                                    >
                                        {generating ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-5 w-5" />
                                        )}
                                        {generating ? 'Generating...' : 'Generate My Vibe'}
                                    </Button>

                                    {/* Example prompts */}
                                    <div className="pt-4 border-t">
                                        <p className="text-sm text-muted-foreground mb-2">Try one of these:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {examplePrompts.map((example, i) => (
                                                <Button
                                                    key={i}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-auto py-1"
                                                    onClick={() => setPrompt(example)}
                                                >
                                                    {example.substring(0, 40)}...
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="mobile" className="mt-8">
                            {/* Mobile Input */}
                            <Card className="border-2 border-primary/20 shadow-lg">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="h-5 w-5 text-primary" />
                                            <span className="font-semibold">Describe Your Mobile App Vibe</span>
                                        </div>
                                        <Badge variant="secondary" className="gap-1">
                                            iOS + Android
                                        </Badge>
                                    </div>
                                    <Textarea
                                        placeholder="e.g., Native iOS feel with clean typography and subtle haptics. Smooth animations, large product images."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        rows={4}
                                        className="resize-none text-lg"
                                    />
                                    <Button
                                        size="lg"
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full gap-2"
                                    >
                                        {generating ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : !hasEmail ? (
                                            <Lock className="h-5 w-5" />
                                        ) : (
                                            <Sparkles className="h-5 w-5" />
                                        )}
                                        {generating ? 'Generating...' : !hasEmail ? 'Enter Email to Generate' : 'Generate Mobile Vibe'}
                                    </Button>

                                    {!hasEmail && (
                                        <p className="text-sm text-center text-muted-foreground">
                                            Mobile vibe generation requires email registration
                                        </p>
                                    )}

                                    {/* Example prompts */}
                                    <div className="pt-4 border-t">
                                        <p className="text-sm text-muted-foreground mb-2">Try one of these:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {examplePrompts.map((example, i) => (
                                                <Button
                                                    key={i}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-auto py-1"
                                                    onClick={() => setPrompt(example)}
                                                >
                                                    {example.substring(0, 40)}...
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Preset Quick Starts */}
                    <div>
                        <p className="text-center text-muted-foreground mb-4">
                            or start from a {vibeType === 'web' ? 'web' : 'mobile'} preset
                        </p>
                        <div className={`grid ${vibeType === 'web' ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
                            {presets.map((preset) => (
                                <Card
                                    key={preset.key}
                                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                                    onClick={() => handlePresetSelect(preset.key)}
                                >
                                    <CardContent className="p-4 text-center">
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${preset.gradient} flex items-center justify-center mx-auto mb-2`}>
                                            <preset.icon className="h-6 w-6 text-white" />
                                        </div>
                                        <p className="font-medium text-sm">{preset.name}</p>
                                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Clone from URL or Upload */}
                    <div className="pt-8 border-t space-y-6">
                        <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-4">
                                or clone an existing design
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Clone from URL */}
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <LinkIcon className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold">Clone from Website</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Enter any website URL and we'll analyze its design, colors, and typography to generate a matching vibe.
                                    </p>
                                    <Input
                                        type="url"
                                        placeholder="https://example.com"
                                        value={cloneUrl}
                                        onChange={(e) => setCloneUrl(e.target.value)}
                                        className="text-sm"
                                    />
                                    <Button
                                        onClick={handleCloneFromURL}
                                        disabled={cloningFromUrl || !cloneUrl.trim()}
                                        className="w-full gap-2"
                                    >
                                        {cloningFromUrl ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Analyzing Website...
                                            </>
                                        ) : (
                                            <>
                                                <LinkIcon className="h-4 w-4" />
                                                Clone Website Design
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Upload Theme File */}
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <FileCode className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold">Upload WordPress Theme</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Upload a WordPress theme .zip file or style.css to extract its design system and colors.
                                    </p>
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                                            <div className="text-center space-y-2">
                                                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                                <div className="text-sm">
                                                    {uploadedFile ? (
                                                        <span className="text-foreground font-medium">{uploadedFile.name}</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-primary font-medium">Click to upload</span>
                                                            <span className="text-muted-foreground"> or drag and drop</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">.zip or .css files</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".css,.zip"
                                                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                                                className="sr-only"
                                            />
                                        </label>
                                    </div>
                                    <Button
                                        onClick={handleFileUpload}
                                        disabled={uploadingFile || !uploadedFile}
                                        className="w-full gap-2"
                                    >
                                        {uploadingFile ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Importing Theme...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4" />
                                                Generate from CSS
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Social Proof */}
                    <div className="text-center pt-8 border-t">
                        <p className="text-sm text-muted-foreground">
                            Trusted by <span className="font-semibold text-foreground">500+</span> cannabis businesses
                        </p>
                    </div>
                </div>
            ) : (
                /* Results Section */
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">
                                    {currentVibe.type === 'web' ? 'Web Menu' : 'Mobile App'}
                                </Badge>
                                {currentVibe.type === 'mobile' && (currentVibe as PublicMobileVibe).platform && (
                                    <Badge variant="secondary">
                                        {(currentVibe as PublicMobileVibe).platform === 'both' ? 'iOS + Android' : (currentVibe as PublicMobileVibe).platform.toUpperCase()}
                                    </Badge>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold">{currentVibe.config.name}</h2>
                            <p className="text-muted-foreground">{currentVibe.config.description || currentVibe.prompt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {saved ? (
                                <Badge variant="default" className="gap-1">
                                    <Check className="h-3 w-3" />
                                    Saved
                                </Badge>
                            ) : (
                                <Button variant="default" onClick={() => { setEmailModalReason('save'); setShowEmailModal(true); }} className="gap-2">
                                    <Save className="h-4 w-4" />
                                    Save My Vibe
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => setShowShareMenu(!showShareMenu)} className="gap-2">
                                <Share2 className="h-4 w-4" />
                                Share
                            </Button>
                            <Button variant="ghost" onClick={startOver}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Start Over
                            </Button>
                        </div>
                    </div>

                    {/* Share Menu */}
                    {showShareMenu && (
                        <Card className="p-4">
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleShare('copy')} className="gap-2">
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? 'Copied!' : 'Copy Link'}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleShare('twitter')} className="gap-2">
                                    <Twitter className="h-4 w-4" />
                                    Twitter
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleShare('linkedin')} className="gap-2">
                                    <Linkedin className="h-4 w-4" />
                                    LinkedIn
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleShare('email')} className="gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Live Preview */}
                    <VibePreview vibe={currentVibe} />

                    {/* Color Palette */}
                    {currentVibe.config.theme?.colors && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-4">Color Palette</h3>
                                <div className="flex flex-wrap gap-4">
                                    {Object.entries(currentVibe.config.theme.colors).slice(0, 6).map(([name, color]) => (
                                        <div key={name} className="flex flex-col items-center gap-1">
                                            <div
                                                className="w-16 h-16 rounded-lg shadow-md border"
                                                style={{ backgroundColor: color as string }}
                                            />
                                            <span className="text-xs text-muted-foreground capitalize">{name}</span>
                                            <span className="text-xs font-mono">{color as string}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Platform-specific info for mobile */}
                    {currentVibe.type === 'mobile' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {(currentVibe as PublicMobileVibe).iosNotes && (
                                <Card>
                                    <CardContent className="p-6">
                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                            <span className="text-lg">🍎</span> iOS Notes
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {(currentVibe as PublicMobileVibe).iosNotes}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                            {(currentVibe as PublicMobileVibe).androidNotes && (
                                <Card>
                                    <CardContent className="p-6">
                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                            <span className="text-lg">🤖</span> Android Notes
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {(currentVibe as PublicMobileVibe).androidNotes}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Components & Typography for web vibes */}
                    {currentVibe.type === 'web' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="font-semibold mb-4">Components</h3>
                                    <div className="space-y-2">
                                        {(currentVibe as PublicVibe).config.components && Object.entries((currentVibe as PublicVibe).config.components!).map(([key, value]) => (
                                            <div key={key} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground capitalize">{key}</span>
                                                <Badge variant="outline">{value}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="font-semibold mb-4">Typography</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Headings</p>
                                            <p className="text-xl font-semibold">
                                                {(currentVibe as PublicVibe).config.theme?.typography?.headingFont || 'Inter'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Body</p>
                                            <p>
                                                {(currentVibe as PublicVibe).config.theme?.typography?.bodyFont || 'Inter'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* AI Reasoning */}
                    {currentVibe.reasoning && (
                        <Card className="bg-muted/50">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold mb-1">AI Reasoning</h3>
                                        <p className="text-muted-foreground">{currentVibe.reasoning}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Refinement (web only) */}
                    {currentVibe.type === 'web' && (
                        <Card className="border-dashed">
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-2">Refine Your Vibe</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Tell us what to change: "make it darker", "add more purple", "use a different font"
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g., Make the headers bolder and add gold accents..."
                                        value={refinementPrompt}
                                        onChange={(e) => setRefinementPrompt(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleRefine} disabled={refining || !refinementPrompt.trim()}>
                                        {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refine'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* CTA */}
                    {!saved && (
                        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                            <CardContent className="p-8 text-center">
                                <h3 className="text-xl font-bold mb-2">Love Your Vibe?</h3>
                                <p className="text-muted-foreground mb-6">
                                    Save it and publish it to your live {currentVibe.type === 'web' ? 'menu' : 'app'} in minutes.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button size="lg" onClick={() => { setEmailModalReason('save'); setShowEmailModal(true); }} className="gap-2">
                                        <Save className="h-4 w-4" />
                                        Save My Vibe (Free)
                                    </Button>
                                    <Button size="lg" variant="outline" asChild>
                                        <Link href="/signup" className="gap-2">
                                            Start Free Trial
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Email Capture Modal */}
            <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {emailModalReason === 'save' && <Save className="h-5 w-5 text-primary" />}
                            {emailModalReason === 'limit' && <Sparkles className="h-5 w-5 text-primary" />}
                            {emailModalReason === 'mobile' && <Smartphone className="h-5 w-5 text-primary" />}
                            {getEmailModalTitle()}
                        </DialogTitle>
                        <DialogDescription>
                            {getEmailModalDescription()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email *
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@dispensary.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {emailModalReason === 'save' && (
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium">
                                    Phone <span className="text-muted-foreground">(optional)</span>
                                </label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="(555) 123-4567"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="marketing"
                                checked={marketingOptIn}
                                onCheckedChange={(c) => setMarketingOptIn(!!c)}
                            />
                            <label
                                htmlFor="marketing"
                                className="text-sm text-muted-foreground cursor-pointer"
                            >
                                Send me tips on growing my dispensary
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => { setShowEmailModal(false); setPendingAction(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={emailModalReason === 'save' ? handleSave : handleEmailSubmitForAccess}
                            disabled={saving || !email.trim()}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {emailModalReason === 'save' ? 'Save My Vibe' : 'Continue'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
