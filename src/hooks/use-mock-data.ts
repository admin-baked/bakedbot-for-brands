'use client';

import { useState, useEffect } from 'react';

export function useMockData() {
    const [isMock, setIsMock] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Parse cookie
        const match = document.cookie.match(new RegExp('(^| )x-use-mock-data=([^;]+)'));
        const mockValue = match ? match[2] === 'true' : false;
        setIsMock(mockValue);
        setIsLoading(false);
    }, []);

    return { isMock, isLoading };
}
