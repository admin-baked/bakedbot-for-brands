'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MockDataToggle() {
    const router = useRouter();
    const [isMock, setIsMock] = useState(false);

    useEffect(() => {
        // Check cookie on mount
        const match = document.cookie.match(new RegExp('(^| )x-use-mock-data=([^;]+)'));
        setIsMock(match ? match[2] === 'true' : false);
    }, []);

    const handleToggle = (checked: boolean) => {
        setIsMock(checked);
        // Set cookie for 1 hour
        document.cookie = `x-use-mock-data=${checked}; path=/; max-age=3600`;
        // Reload to apply changes
        window.location.reload();
    };

    return (
        <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-muted bg-background/50">
            <Database className={`h-4 w-4 ${isMock ? 'text-amber-500' : 'text-green-500'}`} />
            <div className="flex items-center space-x-2">
                <Switch
                    id="mock-mode"
                    checked={isMock}
                    onCheckedChange={handleToggle}
                    className="h-5 w-9"
                />
                <Label htmlFor="mock-mode" className="text-xs font-medium cursor-pointer">
                    {isMock ? 'Mock Data' : 'Live Data'}
                </Label>
            </div>
        </div>
    );
}
