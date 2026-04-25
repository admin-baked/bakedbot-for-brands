'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

export default function RedocWidget() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        if (!scriptLoaded || !containerRef.current) return;

        // Redoc exposes a global Redoc.init after the standalone script loads
        const win = window as any;
        if (typeof win.Redoc?.init === 'function') {
            win.Redoc.init(
                '/openapi.yaml',
                {
                    theme: {
                        colors: { primary: { main: '#059669' } },
                        typography: {
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                            fontSize: '14px',
                            headings: { fontFamily: 'inherit' },
                            code: { fontSize: '13px', fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace' },
                        },
                        sidebar: { backgroundColor: '#fafafa', width: '260px' },
                        rightPanel: { backgroundColor: '#1e1e2e' },
                    },
                    hideDownloadButton: false,
                    noAutoAuth: false,
                    scrollYOffset: 64,
                    hideHostname: false,
                    pathInMiddlePanel: false,
                    nativeScrollbars: false,
                    expandDefaultServerVariables: true,
                    menuToggle: true,
                },
                containerRef.current,
            );
        }
    }, [scriptLoaded]);

    return (
        <>
            <Script
                src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"
                strategy="lazyOnload"
                onLoad={() => setScriptLoaded(true)}
            />
            <div ref={containerRef} className="min-h-screen" />
        </>
    );
}
