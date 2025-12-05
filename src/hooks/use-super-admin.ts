'use client';

// src/hooks/use-super-admin.ts
/**
 * Hook for checking and managing super admin status
 */

import { useState, useEffect, useCallback } from 'react';
import {
    getSuperAdminSession,
    setSuperAdminSession,
    clearSuperAdminSession,
    isSuperAdminEmail
} from '@/lib/super-admin-config';

export function useSuperAdmin() {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [superAdminEmail, setSuperAdminEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check session on mount
    useEffect(() => {
        const session = getSuperAdminSession();
        if (session) {
            setIsSuperAdmin(true);
            setSuperAdminEmail(session.email);
        }
        setIsLoading(false);
    }, []);

    const login = useCallback((email: string): { success: boolean; error?: string } => {
        const normalizedEmail = email.toLowerCase().trim();

        if (!isSuperAdminEmail(normalizedEmail)) {
            return {
                success: false,
                error: 'This email is not authorized for super admin access.'
            };
        }

        const success = setSuperAdminSession(normalizedEmail);
        if (success) {
            setIsSuperAdmin(true);
            setSuperAdminEmail(normalizedEmail);
            return { success: true };
        }

        return { success: false, error: 'Failed to create session.' };
    }, []);

    const logout = useCallback(() => {
        clearSuperAdminSession();
        setIsSuperAdmin(false);
        setSuperAdminEmail(null);
    }, []);

    return {
        isSuperAdmin,
        superAdminEmail,
        isLoading,
        login,
        logout,
    };
}
