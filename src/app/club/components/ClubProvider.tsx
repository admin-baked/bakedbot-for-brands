'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { getClubMemberData } from '@/server/actions/club';
import { getPublicBrandTheme } from '@/server/actions/checkin-management';
import type { Member, Membership, Pass, Reward } from '@/types/club';
import type { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';

interface ClubContextValue {
    orgId: string;
    phone: string;
    member: Member | null;
    membership: Membership | null;
    pass: Pass | null;
    pointsBalance: number;
    rewards: Reward[];
    brandTheme: PublicBrandTheme | null;
    loading: boolean;
    refresh: () => void;
}

const ClubContext = createContext<ClubContextValue | null>(null);

const DEFAULT_ORG = 'org_thrive_syracuse';

export function ClubProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const orgId = searchParams.get('orgId') || DEFAULT_ORG;
    const phone = searchParams.get('phone') || '';

    const [member, setMember] = useState<Member | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [pass, setPass] = useState<Pass | null>(null);
    const [pointsBalance, setPointsBalance] = useState(0);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [brandTheme, setBrandTheme] = useState<PublicBrandTheme | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [memberData, theme] = await Promise.all([
                phone ? getClubMemberData(orgId, phone) : Promise.resolve({ member: null, membership: null, pass: null, pointsBalance: 0, rewards: [] }),
                getPublicBrandTheme(orgId),
            ]);
            setMember(memberData.member);
            setMembership(memberData.membership);
            setPass(memberData.pass);
            setPointsBalance(memberData.pointsBalance);
            setRewards(memberData.rewards);
            setBrandTheme(theme);
        } finally {
            setLoading(false);
        }
    }, [orgId, phone]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    return (
        <ClubContext.Provider value={{
            orgId, phone, member, membership, pass, pointsBalance, rewards, brandTheme, loading,
            refresh: fetchData,
        }}>
            {children}
        </ClubContext.Provider>
    );
}

export function useClub(): ClubContextValue {
    const ctx = useContext(ClubContext);
    if (!ctx) throw new Error('useClub must be used within ClubProvider');
    return ctx;
}
