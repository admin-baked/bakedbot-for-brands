'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function SimulationBanner() {
    const [simulatedRole, setSimulatedRole] = useState<string | null>(null);
    const [isMock, setIsMock] = useState(false);

    useEffect(() => {
        // Check for role cookie
        const roleMatch = document.cookie.match(new RegExp('(^| )x-simulated-role=([^;]+)'));
        if (roleMatch) {
            setSimulatedRole(roleMatch[2]);
        }

        // Check for mock cookie
        const mockMatch = document.cookie.match(new RegExp('(^| )x-use-mock-data=([^;]+)'));
        setIsMock(mockMatch ? mockMatch[2] === 'true' : false);
    }, []);

    const handleExit = () => {
        // Clear cookies
        document.cookie = 'x-simulated-role=; path=/; max-age=0';
        document.cookie = 'x-use-mock-data=; path=/; max-age=0';
        window.location.reload();
    };

    if (!simulatedRole && !isMock) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 ${isMock ? 'bg-purple-600' : 'bg-amber-500'} text-white p-2 z-50 flex items-center justify-center gap-4 shadow-lg transition-colors`}>
            <span className="font-semibold text-sm flex gap-2">
                {simulatedRole && <span>Role: <span className="uppercase">{simulatedRole}</span></span>}
                {simulatedRole && isMock && <span>|</span>}
                {isMock && <span>Data: <span className="uppercase">MOCK</span></span>}
            </span>
            <div className="flex items-center gap-2">
                {simulatedRole && (
                    <Button
                        variant="link"
                        className="h-6 text-xs text-white underline hover:text-gray-200"
                        onClick={() => window.location.href = simulatedRole === 'customer' ? '/account' : '/dashboard/playbooks'}
                    >
                        Go to {simulatedRole.charAt(0).toUpperCase() + simulatedRole.slice(1)} Dashboard
                    </Button>
                )}
                <Button
                    variant="secondary"
                    size="sm"
                    className={`h-6 text-xs bg-white hover:bg-gray-100 ${isMock ? 'text-purple-700' : 'text-amber-600'}`}
                    onClick={handleExit}
                >
                    Exit Simulation
                </Button>
            </div>
        </div>
    );
}
