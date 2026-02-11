'use client';

/**
 * Debug component to diagnose contextual presets issues
 *
 * Add this temporarily to inbox-empty-state.tsx to see what's happening
 */

import { useUserRole } from '@/hooks/use-user-role';
import { useContextualPresets } from '@/hooks/use-contextual-presets';
import { useInboxStore } from '@/lib/store/inbox-store';
import { getQuickActionsForRole } from '@/types/inbox';

export function DebugPresets() {
    const { role } = useUserRole();
    const { currentOrgId, threads } = useInboxStore();
    const { presets, greeting, suggestion, isLoading } = useContextualPresets({
        role,
        orgId: currentOrgId,
    });

    const allActionsForRole = role ? getQuickActionsForRole(role) : [];

    return (
        <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50">
            <h3 className="font-bold mb-2 text-yellow-400">🔍 Presets Debug</h3>

            <div className="space-y-2">
                <div>
                    <strong className="text-green-400">Role:</strong> {role || 'null'}
                </div>

                <div>
                    <strong className="text-green-400">Org ID:</strong> {currentOrgId || 'null'}
                </div>

                <div>
                    <strong className="text-green-400">Loading:</strong> {isLoading ? 'true' : 'false'}
                </div>

                <div>
                    <strong className="text-green-400">Greeting:</strong> {greeting}
                </div>

                <div>
                    <strong className="text-green-400">Suggestion:</strong> {suggestion}
                </div>

                <div>
                    <strong className="text-green-400">Recent Threads:</strong> {threads.length}
                </div>

                <div>
                    <strong className="text-green-400">Presets Returned:</strong> {presets.length}
                    {presets.length > 0 && (
                        <ul className="ml-2 mt-1">
                            {presets.map((p) => (
                                <li key={p.id}>• {p.label} ({p.id})</li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <strong className="text-green-400">All Actions for Role:</strong> {allActionsForRole.length}
                    {allActionsForRole.length > 0 && allActionsForRole.length < 20 && (
                        <ul className="ml-2 mt-1">
                            {allActionsForRole.map((a) => (
                                <li key={a.id}>• {a.label}</li>
                            ))}
                        </ul>
                    )}
                </div>

                {presets.length === 0 && !isLoading && (
                    <div className="mt-2 p-2 bg-red-900/50 rounded">
                        <strong className="text-red-300">⚠️ No presets!</strong>
                        <p className="mt-1">
                            Check: Is role valid? Are there actions for this role in INBOX_QUICK_ACTIONS?
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
