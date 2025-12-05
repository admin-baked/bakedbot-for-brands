'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Role } from '@/hooks/use-user-role';

interface ImpersonationContextType {
    impersonatedRole: Role | null;
    impersonate: (role: Role) => void;
    stopImpersonating: () => void;
    isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
    const [impersonatedRole, setImpersonatedRole] = useState<Role | null>(null);

    useEffect(() => {
        // Load from localStorage on mount
        const stored = localStorage.getItem('impersonated_role');
        if (stored) {
            setImpersonatedRole(stored as Role);
        }
    }, []);

    const impersonate = (role: Role) => {
        setImpersonatedRole(role);
        localStorage.setItem('impersonated_role', role);
        // Force reload to ensure all hooks/components re-evaluate with new role
        window.location.reload();
    };

    const stopImpersonating = () => {
        setImpersonatedRole(null);
        localStorage.removeItem('impersonated_role');
        window.location.reload();
    };

    return (
        <ImpersonationContext.Provider
            value={{
                impersonatedRole,
                impersonate,
                stopImpersonating,
                isImpersonating: !!impersonatedRole,
            }}
        >
            {children}
        </ImpersonationContext.Provider>
    );
}

export function useImpersonation() {
    const context = useContext(ImpersonationContext);
    if (context === undefined) {
        throw new Error('useImpersonation must be used within an ImpersonationProvider');
    }
    return context;
}
