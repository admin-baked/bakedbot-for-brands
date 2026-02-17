'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOrgsForUser } from '@/server/actions/team-management';
import { switchOrgContext } from '@/server/actions/team-management';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { OrgContext } from '@/types/org-membership';

interface OrgSwitcherProps {
    currentOrgId?: string;
}

export function OrgSwitcher({ currentOrgId }: OrgSwitcherProps) {
    const [orgs, setOrgs] = useState<OrgContext[]>([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const loadOrgs = async () => {
            try {
                const result = await getOrgsForUser();
                if (result.success && result.data) {
                    setOrgs(result.data.orgs);
                }
            } catch (error) {
                console.error('[OrgSwitcher] Failed to load orgs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadOrgs();
    }, []);

    // Only show switcher if user has multiple orgs
    if (loading || orgs.length <= 1) {
        return null;
    }

    const currentOrg = orgs.find(o => o.id === currentOrgId);

    const handleOrgChange = async (orgId: string) => {
        if (orgId === currentOrgId) return;

        setSelecting(true);
        try {
            const result = await switchOrgContext(orgId);
            if (result.success) {
                toast({
                    title: 'Organization switched',
                    description: result.message,
                });
                // Force full page reload to pick up new custom claims
                setTimeout(() => window.location.reload(), 500);
            } else {
                toast({
                    title: 'Error',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to switch organization',
                variant: 'destructive',
            });
        } finally {
            setSelecting(false);
        }
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select
                value={currentOrgId || ''}
                onValueChange={handleOrgChange}
                disabled={selecting}
            >
                <SelectTrigger className="border-0 bg-transparent h-auto p-0 focus:ring-0 w-48">
                    <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                    {orgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                            <div className="flex items-center gap-2">
                                <span>{org.name}</span>
                                <span className="text-xs text-muted-foreground capitalize">({org.type})</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
