'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fixEssexApothecary } from '@/server/actions/admin/fix-essex';

export default function FixEssexPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const runFix = async () => {
        setLoading(true);
        setLogs(['Running...']);
        try {
            const result = await fixEssexApothecary();
            setLogs(result.logs);
        } catch (e: any) {
            setLogs(prev => [...prev, `Error: ${e.message}`]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Essex Apothecary Fixer</h1>
            <div className="mb-4 text-sm text-gray-600">
                Updates plan to "Empire" and sets Dutchie credentials.
            </div>
            
            <Button onClick={runFix} disabled={loading}>
                {loading ? 'Fixing...' : 'Run Fix'}
            </Button>

            <div className="mt-6 bg-slate-100 p-4 rounded-md font-mono text-xs whitespace-pre-wrap">
                {logs.length === 0 ? 'Logs will appear here...' : logs.join('\n')}
            </div>
        </div>
    );
}
