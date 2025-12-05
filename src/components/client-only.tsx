'use client';

import { useEffect, useState } from 'react';

/**
 * A wrapper component that only renders its children on the client side.
 * This is useful for wrapping components that rely on browser-specific APIs
 * or random values that might cause hydration mismatches.
 */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
