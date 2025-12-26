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
            <h2 className="text-2xl font-bold tracking-tight text-blue-500">RadioGroup + Card Test</h2>
            
            {/* Testing Card Wrapper */}
            <Card>
                <CardHeader>
                    <CardTitle>Test Card</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup value="test">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="test" id="r1" />
                            <Label htmlFor="r1">Radio Group Inside Card</Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
            
            <p>If you see this, Card is safe. The crash must be Lucide Icons or Button or Data execution.</p>
        </div>
    );
}
