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

    const handleRoleSwitch = (role: string) => {
        document.cookie = `x-simulated-role=${role}; path=/; max-age=3600`;
        window.location.reload();
    };

    const handleExit = () => {
        // Clear cookies
        document.cookie = 'x-simulated-role=; path=/; max-age=0';
        document.cookie = 'x-use-mock-data=; path=/; max-age=0';
        // Redirect to CEO dashboard which is the hub for Super Admins
        window.location.href = '/dashboard/ceo';
    };

    if (!simulatedRole && !isMock) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 ${isMock ? 'bg-purple-600' : 'bg-amber-500'} text-white p-2 z-50 flex items-center justify-between px-6 shadow-lg transition-colors`}>
            <div className="flex items-center gap-4">
                <span className="font-semibold text-sm flex gap-2 items-center">
                    {simulatedRole && (
                        <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                            <span className="text-xs opacity-70">ROLE:</span>
                            <span className="uppercase font-bold">{simulatedRole}</span>
                        </div>
                    )}
                    {isMock && (
                        <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                            <span className="text-xs opacity-70">DATA:</span>
                            <span className="uppercase font-bold">MOCK</span>
                        </div>
                    )}
                </span>
            </div>

            <div className="flex items-center gap-2">
                {/* Role Switcher */}
                <select
                    className="h-8 text-xs bg-black/20 text-white border-0 rounded px-2 cursor-pointer hover:bg-black/30 outline-none focus:ring-1 focus:ring-white/50"
                    value={simulatedRole || ''}
                    onChange={(e) => handleRoleSwitch(e.target.value)}
                >
                    <option value="" disabled>Switch Role...</option>
                    <option value="brand">Brand</option>
                    <option value="dispensary">Dispensary</option>
                    <option value="customer">Customer</option>
                    <option value="owner">Owner</option>
                </select>

                <div className="h-4 w-px bg-white/20 mx-1" />

                {/* Quick Links */}
                {simulatedRole && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-white hover:bg-white/20 hover:text-white"
                        onClick={() => window.location.href = simulatedRole === 'customer' ? '/shop/demo' : '/dashboard/playbooks'}
                    >
                        Go to Dashboard
                    </Button>
                )}

                <Button
                    variant="secondary"
                    size="sm"
                    className={`h-8 text-xs border-0 ${isMock ? 'bg-white text-purple-700 hover:bg-gray-100' : 'bg-white text-amber-600 hover:bg-gray-100'}`}
                    onClick={handleExit}
                >
                    Exit to Super Admin
                </Button>
            </div>
        </div>
    );
}
