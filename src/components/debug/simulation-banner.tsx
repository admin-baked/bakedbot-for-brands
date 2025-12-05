'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function SimulationBanner() {
    const [simulatedRole, setSimulatedRole] = useState<string | null>(null);

    useEffect(() => {
        // Check for cookie on mount
        const match = document.cookie.match(new RegExp('(^| )x-simulated-role=([^;]+)'));
        if (match) {
            setSimulatedRole(match[2]);
        }
    }, []);

    const handleExit = () => {
        // Clear cookie
        document.cookie = 'x-simulated-role=; path=/; max-age=0';
        window.location.reload();
    };

    if (!simulatedRole) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white p-2 z-50 flex items-center justify-center gap-4 shadow-lg">
            <span className="font-semibold text-sm">
                Viewing as: <span className="uppercase">{simulatedRole}</span> (Simulation Mode)
            </span>
            <Button
                variant="secondary"
                size="sm"
                className="h-6 text-xs bg-white text-amber-600 hover:bg-amber-50"
                onClick={handleExit}
            >
                Exit Simulation
            </Button>
        </div>
    );
}
