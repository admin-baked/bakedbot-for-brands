'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, ShieldAlert } from 'lucide-react';

export default function PrivacyToggle() {
    const [privacyMode, setPrivacyMode] = useState(false);

    useEffect(() => {
        // Load preference
        const stored = localStorage.getItem('privacy-mode');
        if (stored === 'true') {
            setPrivacyMode(true);
            document.body.classList.add('privacy-mode');
        }
    }, []);

    const toggle = (checked: boolean) => {
        setPrivacyMode(checked);
        localStorage.setItem('privacy-mode', String(checked));
        if (checked) {
            document.body.classList.add('privacy-mode');
        } else {
            document.body.classList.remove('privacy-mode');
        }
    };

    return (
        <div className="flex items-center space-x-2">
            {privacyMode ? <Shield className="h-4 w-4 text-green-600" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
            <Switch id="privacy-mode" checked={privacyMode} onCheckedChange={toggle} />
            <Label htmlFor="privacy-mode" className="text-sm font-medium">HIPAA Mode</Label>
        </div>
    );
}
