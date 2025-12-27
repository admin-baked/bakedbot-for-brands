'use client';

import { useState, useEffect } from 'react';

export default function CeoSettingsTab() {
    const [count, setCount] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        console.log('Mounting Level 2 Test');
        setMounted(true);
        // Simple interval to test reactivity
        const interval = setInterval(() => {
            setCount(c => c + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) {
        return <div className="p-8 text-yellow-600">Loading Hook Test...</div>;
    }

    return (
        <div className="p-8 text-green-600 font-mono">
            <h1 className="text-2xl font-bold">Hooks Are Working</h1>
            <p>Count: {count}</p>
            <p>If you see this, basic React Hooks are safe.</p>
        </div>
    );
}
