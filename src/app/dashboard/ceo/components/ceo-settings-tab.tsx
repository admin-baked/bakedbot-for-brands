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
            <h2 className="text-2xl font-bold tracking-tight text-blue-500">RadioGroup Isolation Test</h2>
            
            {/* Testing RadioGroup Isolation */}
            <div className="p-4 border border-gray-200 rounded">
                <RadioGroup value="test">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="test" id="r1" />
                        <Label htmlFor="r1">Radio Group is Working</Label>
                    </div>
                </RadioGroup>
            </div>
            
            <p>If you see this, RadioGroup is safe. The crash is likely in Card or Icons.</p>
        </div>
    );
}
