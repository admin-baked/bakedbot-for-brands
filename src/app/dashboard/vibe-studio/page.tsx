// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

/**
 * Vibe Studio Dashboard
 *
 * AI-powered menu/website customization.
 * Let users describe their vibe and generate custom themes.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2,
    Sparkles,
    Palette,
    Wand2,
    Copy,
    Trash2,
    Check,
    Eye,
    MoreVertical,
    Plus,
    Zap,
    Moon,
    Sun,
    Leaf,
    Flame,
    Star,
    Smartphone,
    Apple,
    TabletSmartphone,
    Layers,
    Bell,
    Vibrate,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

import {
    getVibes,
    createVibeFromPreset,
    generateVibeFromPrompt,
    refineVibeWithPrompt,
    publishVibe,
    deleteVibe,
    duplicateVibe,
    getMobileVibes,
    createMobileVibeFromPreset,
    generateMobileVibeFromPrompt,
    refineMobileVibeWithPrompt,
    publishMobileVibe,
    deleteMobileVibe,
    generateMobileVibeFromWebVibe,
} from '@/app/actions/vibe';
import type { VibeConfig, MobileVibeConfig, MobilePlatform } from '@/types/vibe';
import { MOBILE_VIBE_PRESETS } from '@/types/vibe';

// Preset cards for quick starts (Web)
const PRESET_CARDS = [
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
        gradient: 'from-blue-500 to-cyan-500',
    },
    {
        key: 'bold-branded',
        name: 'Bold Branded',
        description: 'Strong brand presence',
        icon: Layers,
        gradient: 'from-purple-500 to-pink-500',
    },
    {
        key: 'minimal-fast',
        name: 'Minimal Fast',
        description: 'Performance-focused',
        icon: Zap,
        gradient: 'from-gray-500 to-slate-600',
    },
    {
        key: 'luxury-immersive',
        name: 'Luxury Immersive',
        description: 'Premium experience',
        icon: Star,
        gradient: 'from-amber-500 to-orange-600',
    },
];

export default function VibeStudioPage() {
    // Web vibe state
    const [vibes, setVibes] = useState<VibeConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState<'creative' | 'balanced' | 'conservative'>('balanced');
    const [selectedVibe, setSelectedVibe] = useState<VibeConfig | null>(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [refining, setRefining] = useState(false);

    // Mobile vibe state
    const [mobileVibes, setMobileVibes] = useState<MobileVibeConfig[]>([]);
    const [mobileLoading, setMobileLoading] = useState(true);
    const [mobileGenerating, setMobileGenerating] = useState(false);
    const [mobilePrompt, setMobilePrompt] = useState('');
    const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>('both');
    const [mobileStyle, setMobileStyle] = useState<'native' | 'branded' | 'playful' | 'minimal'>('branded');
    const [selectedMobileVibe, setSelectedMobileVibe] = useState<MobileVibeConfig | null>(null);
    const [mobileRefinementPrompt, setMobileRefinementPrompt] = useState('');
    const [mobileRefining, setMobileRefining] = useState(false);

    const { toast } = useToast();

    // Load vibes on mount
    useEffect(() => {
        loadVibes();
        loadMobileVibes();
    }, []);

    const loadVibes = async () => {
        setLoading(true);
        try {
            const result = await getVibes();
            if (result.success && result.data) {
                setVibes(result.data);
            }
        } catch (error) {
            logger.error('[VIBE-STUDIO] Failed to load vibes', { error: error instanceof Error ? error.message : String(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: 'Enter a description',
                description: 'Tell us what vibe you want for your menu.',
                variant: 'destructive',
            });
            return;
        }

        setGenerating(true);
        try {
            const result = await generateVibeFromPrompt(prompt, style);
            if (result.success && result.data) {
                toast({
                    title: 'Vibe Generated!',
                    description: result.reasoning || `Created "${result.data.name}"`,
                });
                setVibes(prev => [result.data!, ...prev]);
                setSelectedVibe(result.data);
                setPrompt('');
            } else {
                toast({
                    title: 'Generation Failed',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to generate vibe',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handlePresetSelect = async (presetKey: string) => {
        setGenerating(true);
        try {
            const result = await createVibeFromPreset(presetKey);
            if (result.success && result.data) {
                toast({
                    title: 'Preset Applied!',
                    description: `Created "${result.data.name}"`,
                });
                setVibes(prev => [result.data!, ...prev]);
                setSelectedVibe(result.data);
            } else {
                toast({
                    title: 'Failed',
                    description: result.error || 'Could not apply preset',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to apply preset',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!selectedVibe || !refinementPrompt.trim()) return;

        setRefining(true);
        try {
            const result = await refineVibeWithPrompt(selectedVibe.id, refinementPrompt);
            if (result.success && result.data) {
                toast({
                    title: 'Vibe Refined!',
                    description: result.reasoning || 'Changes applied',
                });
                setVibes(prev => prev.map(v => v.id === result.data!.id ? result.data! : v));
                setSelectedVibe(result.data);
                setRefinementPrompt('');
            } else {
                toast({
                    title: 'Refinement Failed',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to refine vibe',
                variant: 'destructive',
            });
        } finally {
            setRefining(false);
        }
    };

    const handlePublish = async (vibeId: string) => {
        try {
            const result = await publishVibe(vibeId);
            if (result.success) {
                toast({
                    title: 'Published!',
                    description: 'Your vibe is now live on your menu.',
                });
                await loadVibes();
            } else {
                toast({
                    title: 'Failed',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to publish vibe',
                variant: 'destructive',
            });
        }
    };

    const handleDuplicate = async (vibeId: string) => {
        try {
            const result = await duplicateVibe(vibeId);
            if (result.success && result.data) {
                toast({ title: 'Duplicated!' });
                setVibes(prev => [result.data!, ...prev]);
            }
        } catch (error) {
            toast({ title: 'Failed to duplicate', variant: 'destructive' });
        }
    };

    const handleDelete = async (vibeId: string) => {
        try {
            const result = await deleteVibe(vibeId);
            if (result.success) {
                toast({ title: 'Deleted' });
                setVibes(prev => prev.filter(v => v.id !== vibeId));
                if (selectedVibe?.id === vibeId) {
                    setSelectedVibe(null);
                }
            }
        } catch (error) {
            toast({ title: 'Failed to delete', variant: 'destructive' });
        }
    };

    // ============================================
    // MOBILE VIBE HANDLERS
    // ============================================

    const loadMobileVibes = async () => {
        setMobileLoading(true);
        try {
            const result = await getMobileVibes();
            if (result.success && result.data) {
                setMobileVibes(result.data);
            }
        } catch (error) {
            logger.error('[VIBE-STUDIO] Failed to load mobile vibes', { error: error instanceof Error ? error.message : String(error) });
        } finally {
            setMobileLoading(false);
        }
    };

    const handleMobileGenerate = async () => {
        if (!mobilePrompt.trim()) {
            toast({
                title: 'Enter a description',
                description: 'Tell us what vibe you want for your mobile app.',
                variant: 'destructive',
            });
            return;
        }

        setMobileGenerating(true);
        try {
            const result = await generateMobileVibeFromPrompt(mobilePrompt, mobilePlatform, mobileStyle);
            if (result.success && result.data) {
                toast({
                    title: 'Mobile Vibe Generated!',
                    description: result.reasoning || `Created "${result.data.name}"`,
                });
                setMobileVibes(prev => [result.data!, ...prev]);
                setSelectedMobileVibe(result.data);
                setMobilePrompt('');
            } else {
                toast({
                    title: 'Generation Failed',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to generate mobile vibe',
                variant: 'destructive',
            });
        } finally {
            setMobileGenerating(false);
        }
    };

    const handleMobilePresetSelect = async (presetKey: string) => {
        setMobileGenerating(true);
        try {
            const result = await createMobileVibeFromPreset(presetKey);
            if (result.success && result.data) {
                toast({
                    title: 'Mobile Preset Applied!',
                    description: `Created "${result.data.name}"`,
                });
                setMobileVibes(prev => [result.data!, ...prev]);
                setSelectedMobileVibe(result.data);
            } else {
                toast({
                    title: 'Failed',
                    description: result.error || 'Could not apply preset',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to apply mobile preset',
                variant: 'destructive',
            });
        } finally {
            setMobileGenerating(false);
        }
    };

    const handleMobileRefine = async () => {
        if (!selectedMobileVibe || !mobileRefinementPrompt.trim()) return;

        setMobileRefining(true);
        try {
            const result = await refineMobileVibeWithPrompt(selectedMobileVibe.id, mobileRefinementPrompt);
            if (result.success && result.data) {
                toast({
                    title: 'Mobile Vibe Refined!',
                    description: result.reasoning || 'Changes applied',
                });
                setMobileVibes(prev => prev.map(v => v.id === result.data!.id ? result.data! : v));
                setSelectedMobileVibe(result.data);
                setMobileRefinementPrompt('');
            } else {
                toast({
                    title: 'Refinement Failed',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to refine mobile vibe',
                variant: 'destructive',
            });
        } finally {
            setMobileRefining(false);
        }
    };

    const handleMobilePublish = async (vibeId: string) => {
        try {
            const result = await publishMobileVibe(vibeId);
            if (result.success) {
                toast({
                    title: 'Published!',
                    description: 'Your mobile vibe is now live.',
                });
                await loadMobileVibes();
            } else {
                toast({
                    title: 'Failed',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to publish mobile vibe',
                variant: 'destructive',
            });
        }
    };

    const handleMobileDelete = async (vibeId: string) => {
        try {
            const result = await deleteMobileVibe(vibeId);
            if (result.success) {
                toast({ title: 'Deleted' });
                setMobileVibes(prev => prev.filter(v => v.id !== vibeId));
                if (selectedMobileVibe?.id === vibeId) {
                    setSelectedMobileVibe(null);
                }
            }
        } catch (error) {
            toast({ title: 'Failed to delete', variant: 'destructive' });
        }
    };

    const handleGenerateMobileFromWeb = async (webVibeId: string) => {
        setMobileGenerating(true);
        try {
            const result = await generateMobileVibeFromWebVibe(webVibeId, undefined, mobilePlatform);
            if (result.success && result.data) {
                toast({
                    title: 'Mobile Vibe Created!',
                    description: `Created mobile version: "${result.data.name}"`,
                });
                setMobileVibes(prev => [result.data!, ...prev]);
                setSelectedMobileVibe(result.data);
            } else {
                toast({
                    title: 'Failed',
                    description: result.error || 'Could not generate mobile vibe',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to generate mobile vibe from web',
                variant: 'destructive',
            });
        } finally {
            setMobileGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Palette className="h-8 w-8 text-primary" />
                        Vibe Studio
                    </h1>
                    <p className="text-muted-foreground">
                        Describe your vibe and AI will design your menu
                    </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Powered
                </Badge>
            </div>

            <Tabs defaultValue="create" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="create">Web</TabsTrigger>
                    <TabsTrigger value="mobile" className="gap-1">
                        <Smartphone className="h-4 w-4" />
                        Mobile
                    </TabsTrigger>
                    <TabsTrigger value="my-vibes">My Vibes ({vibes.length + mobileVibes.length})</TabsTrigger>
                </TabsList>

                {/* CREATE TAB */}
                <TabsContent value="create" className="space-y-6">
                    {/* AI Generation */}
                    <Card className="border-2 border-dashed border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wand2 className="h-5 w-5 text-primary" />
                                Describe Your Vibe
                            </CardTitle>
                            <CardDescription>
                                Tell us what aesthetic you want. Be specific or creative!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="e.g., Dark and moody with neon green accents. Think cyberpunk meets cannabis. I want products to glow on hover and a robot chatbot."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                            <div className="flex items-center gap-4">
                                <Select value={style} onValueChange={(v: any) => setStyle(v)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="creative">Creative (Bold)</SelectItem>
                                        <SelectItem value="balanced">Balanced</SelectItem>
                                        <SelectItem value="conservative">Conservative (Safe)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating || !prompt.trim()}
                                    className="gap-2"
                                >
                                    {generating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                    Generate Vibe
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Start Presets */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Quick Start Presets</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {PRESET_CARDS.map((preset) => (
                                <Card
                                    key={preset.key}
                                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                                    onClick={() => handlePresetSelect(preset.key)}
                                >
                                    <CardContent className="p-4">
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${preset.gradient} flex items-center justify-center mb-3`}>
                                            <preset.icon className="h-6 w-6 text-white" />
                                        </div>
                                        <h3 className="font-semibold">{preset.name}</h3>
                                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Selected Vibe Preview */}
                    {selectedVibe && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{selectedVibe.name}</CardTitle>
                                        <CardDescription>{selectedVibe.description || selectedVibe.prompt}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={selectedVibe.status === 'published' ? 'default' : 'secondary'}>
                                            {selectedVibe.status}
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={() => handlePublish(selectedVibe.id)}>
                                            <Check className="h-4 w-4 mr-1" />
                                            Publish
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Color Palette */}
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Color Palette</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedVibe.theme?.colors && Object.entries(selectedVibe.theme.colors).map(([name, color]) => (
                                            <div key={name} className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-md border shadow-sm"
                                                    style={{ backgroundColor: color }}
                                                    title={`${name}: ${color}`}
                                                />
                                                <span className="text-xs text-muted-foreground">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Components */}
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Components</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedVibe.components && Object.entries(selectedVibe.components).map(([component, variant]) => (
                                            <Badge key={component} variant="outline">
                                                {component}: {variant}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Typography */}
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Typography</h4>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <span>Headings: <strong>{selectedVibe.theme?.typography?.headingFont}</strong></span>
                                        <span>Body: <strong>{selectedVibe.theme?.typography?.bodyFont}</strong></span>
                                    </div>
                                </div>

                                {/* Refinement */}
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-medium mb-2">Refine This Vibe</h4>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g., Make it darker, add more green..."
                                            value={refinementPrompt}
                                            onChange={(e) => setRefinementPrompt(e.target.value)}
                                        />
                                        <Button
                                            onClick={handleRefine}
                                            disabled={refining || !refinementPrompt.trim()}
                                        >
                                            {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refine'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* MOBILE TAB */}
                <TabsContent value="mobile" className="space-y-6">
                    {/* AI Generation for Mobile */}
                    <Card className="border-2 border-dashed border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-primary" />
                                Describe Your Mobile App Vibe
                            </CardTitle>
                            <CardDescription>
                                Design your iOS and Android app experience with AI
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="e.g., A sleek, dark-themed app with smooth animations. Native feel on iOS with SF Pro fonts and vibrancy. Material You on Android with dynamic colors. Floating chat bubble and quick add-to-cart."
                                value={mobilePrompt}
                                onChange={(e) => setMobilePrompt(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                            <div className="flex flex-wrap items-center gap-4">
                                <Select value={mobilePlatform} onValueChange={(v: MobilePlatform) => setMobilePlatform(v)}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="both">
                                            <span className="flex items-center gap-2">
                                                <TabletSmartphone className="h-4 w-4" />
                                                Both
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="ios">
                                            <span className="flex items-center gap-2">
                                                <Apple className="h-4 w-4" />
                                                iOS Only
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="android">
                                            <span className="flex items-center gap-2">
                                                <Smartphone className="h-4 w-4" />
                                                Android Only
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={mobileStyle} onValueChange={(v: any) => setMobileStyle(v)}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="native">Native Feel</SelectItem>
                                        <SelectItem value="branded">Branded</SelectItem>
                                        <SelectItem value="playful">Playful</SelectItem>
                                        <SelectItem value="minimal">Minimal</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleMobileGenerate}
                                    disabled={mobileGenerating || !mobilePrompt.trim()}
                                    className="gap-2"
                                >
                                    {mobileGenerating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                    Generate Mobile Vibe
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Derive from Web Vibe */}
                    {vibes.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Layers className="h-4 w-4" />
                                    Create from Web Vibe
                                </CardTitle>
                                <CardDescription>
                                    Generate a matching mobile app theme from your existing web vibe
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {vibes.slice(0, 5).map((vibe) => (
                                        <Button
                                            key={vibe.id}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleGenerateMobileFromWeb(vibe.id)}
                                            disabled={mobileGenerating}
                                            className="gap-2"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: vibe.theme?.colors?.primary }}
                                            />
                                            {vibe.name}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Mobile Quick Start Presets */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Mobile Presets</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {MOBILE_PRESET_CARDS.map((preset) => (
                                <Card
                                    key={preset.key}
                                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                                    onClick={() => handleMobilePresetSelect(preset.key)}
                                >
                                    <CardContent className="p-4">
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${preset.gradient} flex items-center justify-center mb-3`}>
                                            <preset.icon className="h-6 w-6 text-white" />
                                        </div>
                                        <h3 className="font-semibold">{preset.name}</h3>
                                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Selected Mobile Vibe Preview */}
                    {selectedMobileVibe && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {selectedMobileVibe.name}
                                            <Badge variant="outline" className="ml-2">
                                                {selectedMobileVibe.platform === 'both' ? 'iOS & Android' :
                                                 selectedMobileVibe.platform === 'ios' ? 'iOS' : 'Android'}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>{selectedMobileVibe.description || selectedMobileVibe.prompt}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={selectedMobileVibe.status === 'published' ? 'default' : 'secondary'}>
                                            {selectedMobileVibe.status}
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={() => handleMobilePublish(selectedMobileVibe.id)}>
                                            <Check className="h-4 w-4 mr-1" />
                                            Publish
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Color Palette */}
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Color Palette</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMobileVibe.theme?.colors && Object.entries(selectedMobileVibe.theme.colors).map(([name, color]) => (
                                            <div key={name} className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-md border shadow-sm"
                                                    style={{ backgroundColor: color }}
                                                    title={`${name}: ${color}`}
                                                />
                                                <span className="text-xs text-muted-foreground">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Platform Configs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* iOS Config */}
                                    {(selectedMobileVibe.platform === 'ios' || selectedMobileVibe.platform === 'both') && selectedMobileVibe.ios && (
                                        <div className="p-4 border rounded-lg">
                                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                <Apple className="h-4 w-4" />
                                                iOS Settings
                                            </h4>
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p>Font: <strong>{selectedMobileVibe.ios.font}</strong></p>
                                                <p>Navigation: <strong>{selectedMobileVibe.ios.navigationStyle}</strong></p>
                                                <p>Tab Bar: <strong>{selectedMobileVibe.ios.tabBarStyle}</strong></p>
                                                <div className="flex gap-2 mt-2">
                                                    {selectedMobileVibe.ios.usesVibrancy && <Badge variant="outline">Vibrancy</Badge>}
                                                    {selectedMobileVibe.ios.usesHaptics && <Badge variant="outline">Haptics</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Android Config */}
                                    {(selectedMobileVibe.platform === 'android' || selectedMobileVibe.platform === 'both') && selectedMobileVibe.android && (
                                        <div className="p-4 border rounded-lg">
                                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                <Smartphone className="h-4 w-4" />
                                                Android Settings
                                            </h4>
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p>Font: <strong>{selectedMobileVibe.android.font}</strong></p>
                                                <p>Color Scheme: <strong>{selectedMobileVibe.android.colorScheme}</strong></p>
                                                <p>Navigation: <strong>{selectedMobileVibe.android.navigationStyle}</strong></p>
                                                <div className="flex gap-2 mt-2">
                                                    {selectedMobileVibe.android.usesDynamicColor && <Badge variant="outline">Dynamic Color</Badge>}
                                                    {selectedMobileVibe.android.usesPredictiveBack && <Badge variant="outline">Predictive Back</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Components */}
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Components</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMobileVibe.components && (
                                            <>
                                                <Badge variant="outline">Card: {selectedMobileVibe.components.productCard}</Badge>
                                                <Badge variant="outline">Nav: {selectedMobileVibe.components.navigation}</Badge>
                                                <Badge variant="outline">Chat: {selectedMobileVibe.components.chat}</Badge>
                                                <Badge variant="outline">Cart: {selectedMobileVibe.components.cart}</Badge>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Animations */}
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Animations</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMobileVibe.animations && (
                                            <>
                                                <Badge variant="outline">Transition: {selectedMobileVibe.animations.screenTransition}</Badge>
                                                <Badge variant="outline">Tap: {selectedMobileVibe.animations.tapFeedback}</Badge>
                                                {selectedMobileVibe.animations.useHaptics && (
                                                    <Badge variant="outline">
                                                        <Vibrate className="h-3 w-3 mr-1" />
                                                        Haptics: {selectedMobileVibe.animations.hapticIntensity}
                                                    </Badge>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Refinement */}
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-medium mb-2">Refine This Mobile Vibe</h4>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g., Make it more playful, add larger icons..."
                                            value={mobileRefinementPrompt}
                                            onChange={(e) => setMobileRefinementPrompt(e.target.value)}
                                        />
                                        <Button
                                            onClick={handleMobileRefine}
                                            disabled={mobileRefining || !mobileRefinementPrompt.trim()}
                                        >
                                            {mobileRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refine'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* My Mobile Vibes */}
                    {mobileVibes.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4">My Mobile Vibes ({mobileVibes.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {mobileVibes.map((vibe) => (
                                    <Card key={vibe.id} className="group hover:shadow-lg transition-shadow">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-base truncate flex items-center gap-2">
                                                        {vibe.platform === 'ios' ? <Apple className="h-4 w-4" /> :
                                                         vibe.platform === 'android' ? <Smartphone className="h-4 w-4" /> :
                                                         <TabletSmartphone className="h-4 w-4" />}
                                                        {vibe.name}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs line-clamp-2">
                                                        {vibe.prompt || vibe.description}
                                                    </CardDescription>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setSelectedMobileVibe(vibe)}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        {vibe.status !== 'published' && (
                                                            <DropdownMenuItem onClick={() => handleMobilePublish(vibe.id)}>
                                                                <Check className="h-4 w-4 mr-2" />
                                                                Publish
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() => handleMobileDelete(vibe.id)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pb-3">
                                            {/* Mini color palette preview */}
                                            <div className="flex gap-1 mb-3">
                                                {vibe.theme?.colors && (
                                                    <>
                                                        <div
                                                            className="w-6 h-6 rounded"
                                                            style={{ backgroundColor: vibe.theme.colors.primary }}
                                                        />
                                                        <div
                                                            className="w-6 h-6 rounded"
                                                            style={{ backgroundColor: vibe.theme.colors.secondary }}
                                                        />
                                                        <div
                                                            className="w-6 h-6 rounded"
                                                            style={{ backgroundColor: vibe.theme.colors.accent }}
                                                        />
                                                        <div
                                                            className="w-6 h-6 rounded border"
                                                            style={{ backgroundColor: vibe.theme.colors.background }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Badge
                                                    variant={
                                                        vibe.status === 'published' ? 'default' :
                                                        vibe.status === 'draft' ? 'secondary' : 'outline'
                                                    }
                                                >
                                                    {vibe.status === 'published' && <Star className="h-3 w-3 mr-1" />}
                                                    {vibe.status}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    v{vibe.version}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* MY VIBES TAB */}
                <TabsContent value="my-vibes" className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : vibes.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium">No vibes yet</p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Create your first vibe to get started
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vibes.map((vibe) => (
                                <Card key={vibe.id} className="group hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base truncate">{vibe.name}</CardTitle>
                                                <CardDescription className="text-xs line-clamp-2">
                                                    {vibe.prompt || vibe.description}
                                                </CardDescription>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setSelectedVibe(vibe)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicate(vibe.id)}>
                                                        <Copy className="h-4 w-4 mr-2" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    {vibe.status !== 'published' && (
                                                        <DropdownMenuItem onClick={() => handlePublish(vibe.id)}>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Publish
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(vibe.id)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        {/* Mini color palette preview */}
                                        <div className="flex gap-1 mb-3">
                                            {vibe.theme?.colors && (
                                                <>
                                                    <div
                                                        className="w-6 h-6 rounded"
                                                        style={{ backgroundColor: vibe.theme.colors.primary }}
                                                    />
                                                    <div
                                                        className="w-6 h-6 rounded"
                                                        style={{ backgroundColor: vibe.theme.colors.secondary }}
                                                    />
                                                    <div
                                                        className="w-6 h-6 rounded"
                                                        style={{ backgroundColor: vibe.theme.colors.accent }}
                                                    />
                                                    <div
                                                        className="w-6 h-6 rounded border"
                                                        style={{ backgroundColor: vibe.theme.colors.background }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                variant={
                                                    vibe.status === 'published' ? 'default' :
                                                    vibe.status === 'draft' ? 'secondary' : 'outline'
                                                }
                                            >
                                                {vibe.status === 'published' && <Star className="h-3 w-3 mr-1" />}
                                                {vibe.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                v{vibe.version}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
