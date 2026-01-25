'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageCircle, Bot, Sparkles, Upload, Crown, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/client';
import { v4 as uuidv4 } from 'uuid';

interface ChatbotConfig {
    basePrompt?: string;
    welcomeMessage?: string;
    personality?: string;
    tone?: string;
    sellingPoints?: string;
    enabled?: boolean;
    botName?: string;
    mascotImageUrl?: string;
}

interface ChatbotSettingsTabProps {
    planId?: string;
}

export function ChatbotSettingsTab({ planId }: ChatbotSettingsTabProps) {
    const { brandId, dispensaryId, isLoading: idLoading, isBrandRole } = useUserRole();
    const orgId = isBrandRole ? brandId : dispensaryId;
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingMascot, setUploadingMascot] = useState(false);
    
    // Config state
    const [enabled, setEnabled] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [personality, setPersonality] = useState('');
    const [sellingPoints, setSellingPoints] = useState('');
    const [botName, setBotName] = useState('');
    const [mascotImageUrl, setMascotImageUrl] = useState('');
    
    const isEmpirePlan = planId === 'empire';
    
    // Load existing config
    useEffect(() => {
        async function loadConfig() {
            if (!orgId) return;
            
            try {
                // Try brands collection first, then locations
                let configDoc = await getDoc(doc(db, 'brands', orgId));
                if (!configDoc.exists()) {
                    configDoc = await getDoc(doc(db, 'locations', orgId));
                }
                
                if (configDoc.exists()) {
                    const data = configDoc.data();
                    const config = data.chatbotConfig || {};
                    
                    setEnabled(config.enabled !== false);
                    setWelcomeMessage(config.welcomeMessage || '');
                    setPersonality(config.personality || '');
                    setSellingPoints(config.sellingPoints || '');
                    setBotName(config.botName || '');
                    setMascotImageUrl(config.mascotImageUrl || '');
                }
            } catch (error) {
                console.error('Error loading chatbot config:', error);
            } finally {
                setLoading(false);
            }
        }
        
        if (!idLoading) {
            loadConfig();
        }
    }, [orgId, idLoading]);
    
    const handleMascotUpload = async (file: File) => {
        if (!dispensaryId || !file) return;
        
        setUploadingMascot(true);
        try {
            const fileId = uuidv4();
            const ext = file.name.split('.').pop();
            const storageRef = ref(storage, `brands/${orgId}/mascot/${fileId}.${ext}`);
            
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            
            setMascotImageUrl(url);
            toast({ title: 'Mascot uploaded', description: 'Your custom mascot image has been uploaded.' });
        } catch (error) {
            console.error('Error uploading mascot:', error);
            toast({ title: 'Upload failed', description: 'Could not upload mascot image.', variant: 'destructive' });
        } finally {
            setUploadingMascot(false);
        }
    };
    
    const handleSave = async () => {
        if (!orgId) return;
        
        setSaving(true);
        try {
            const config: ChatbotConfig = {
                enabled,
                welcomeMessage: welcomeMessage.trim() || undefined,
                personality: personality.trim() || undefined,
                sellingPoints: sellingPoints.trim() || undefined,
            };
            
            // Only save Empire features if on Empire plan
            if (isEmpirePlan) {
                config.botName = botName.trim() || undefined;
                config.mascotImageUrl = mascotImageUrl || undefined;
            }
            
            // Try brands collection first
            const brandRef = doc(db, 'brands', orgId);
            const brandDoc = await getDoc(brandRef);
            
            if (brandDoc.exists()) {
                await updateDoc(brandRef, {
                    chatbotConfig: {
                        ...config,
                        updatedAt: serverTimestamp(),
                    },
                });
            } else {
                // Try locations
                const locationRef = doc(db, 'locations', orgId);
                await updateDoc(locationRef, {
                    chatbotConfig: {
                        ...config,
                        updatedAt: serverTimestamp(),
                    },
                });
            }
            
            toast({ title: 'Settings saved', description: 'Chatbot configuration has been updated.' });
        } catch (error) {
            console.error('Error saving chatbot config:', error);
            toast({ title: 'Save failed', description: 'Could not save chatbot settings.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };
    
    if (idLoading || loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Smokey AI Configuration
                    </h3>
                    <p className="text-sm text-muted-foreground">Customize your AI budtender's behavior.</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save Changes
                </Button>
            </div>
            
            {/* Enable/Disable Toggle */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Enable Chatbot</CardTitle>
                            <CardDescription>Show the Smokey AI widget on your menu page.</CardDescription>
                        </div>
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                    </div>
                </CardHeader>
            </Card>
            
            {/* Basic Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Message Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="welcomeMessage">Welcome Message</Label>
                        <Textarea
                            id="welcomeMessage"
                            placeholder="Hey! I'm your AI budtender. What are you looking for today?"
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            The first message shown when a customer opens the chatbot.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="personality">Personality</Label>
                        <Input
                            id="personality"
                            placeholder="Friendly, knowledgeable, helpful"
                            value={personality}
                            onChange={(e) => setPersonality(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Keywords that describe your budtender's personality.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="sellingPoints">Key Selling Points</Label>
                        <Textarea
                            id="sellingPoints"
                            placeholder="We have the widest selection of premium flower in the city. Our edibles are locally made. We offer same-day delivery."
                            value={sellingPoints}
                            onChange={(e) => setSellingPoints(e.target.value)}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Things your AI should highlight when recommending products.
                        </p>
                    </div>
                </CardContent>
            </Card>
            
            {/* Empire Plan Features */}
            <Card className={!isEmpirePlan ? 'opacity-60' : ''}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        White-Label Your AI
                        {!isEmpirePlan && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                Empire Plan
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Customize the AI's name and mascot image for a fully branded experience.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isEmpirePlan && (
                        <Alert>
                            <Sparkles className="h-4 w-4" />
                            <AlertDescription>
                                Upgrade to <strong>The Empire</strong> plan to white-label your AI assistant with a custom name and mascot.
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="botName">Custom Bot Name</Label>
                        <Input
                            id="botName"
                            placeholder="e.g., Buddy, Herb, Kush Guide"
                            value={botName}
                            onChange={(e) => setBotName(e.target.value)}
                            disabled={!isEmpirePlan}
                        />
                        <p className="text-xs text-muted-foreground">
                            Replace "Smokey" with your own brand mascot name.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Custom Mascot Image</Label>
                        <div className="flex items-center gap-4">
                            {mascotImageUrl ? (
                                <div className="relative">
                                    <img
                                        src={mascotImageUrl}
                                        alt="Custom mascot"
                                        className="h-20 w-20 rounded-full object-cover border-2 border-primary"
                                    />
                                    {isEmpirePlan && (
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute -top-2 -right-2 h-6 w-6"
                                            onClick={() => setMascotImageUrl('')}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted">
                                    <Bot className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                            
                            <div>
                                <input
                                    type="file"
                                    id="mascotUpload"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={!isEmpirePlan || uploadingMascot}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleMascotUpload(file);
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    disabled={!isEmpirePlan || uploadingMascot}
                                    onClick={() => document.getElementById('mascotUpload')?.click()}
                                >
                                    {uploadingMascot ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    Upload Mascot
                                </Button>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Recommended: 200x200px PNG with transparent background.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Preview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Preview</CardTitle>
                    <CardDescription>How your chatbot will appear to customers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted rounded-lg p-4 max-w-sm">
                        <div className="flex items-start gap-3">
                            {mascotImageUrl && isEmpirePlan ? (
                                <img
                                    src={mascotImageUrl}
                                    alt="Bot"
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-primary-foreground" />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-sm">
                                    {(isEmpirePlan && botName) || 'Smokey'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {welcomeMessage || "Hey! I'm your AI budtender. What are you looking for today?"}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
