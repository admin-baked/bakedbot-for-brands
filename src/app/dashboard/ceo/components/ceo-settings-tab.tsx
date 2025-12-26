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
    const [loading, setLoading] = useState(false); 
    const [emailProvider, setEmailProvider] = useState<'sendgrid' | 'mailjet'>('sendgrid');
    const [videoProvider, setVideoProvider] = useState<'veo' | 'sora'>('veo');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // loadSettings(); // DEBUG: DISABLED
    }, []);

    if (!mounted) {
        return <div className="flex h-[200px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    const loadSettings = async () => {}; // No-op
    const handleSave = async () => {}; // No-op

    return (
        <div className="space-y-6 p-4 border border-blue-500 rounded">
            <h2 className="text-2xl font-bold tracking-tight text-blue-500">Button + Icons Test</h2>
            
            {/* Testing Icons */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle>Test Card with Icons</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <RadioGroup value="test">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="test" id="r1" />
                            <Label htmlFor="r1">Radio Group</Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        <CardTitle>Video Icon Test</CardTitle>
                    </div>
                </CardHeader>
            </Card>
            
            <div className="flex justify-end sticky bottom-4">
                <Button onClick={handleSave} disabled={false} size="lg" className="shadow-lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test Button (Save)
                </Button>
            </div>
            
            <p>If you see the Button and it doesn't crash, the UI IS SAFE. The crash is definitely loadSettings().</p>
        </div>
    );
}
