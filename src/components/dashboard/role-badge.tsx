'use client';

/**
 * Role Badge Component
 * Shows user's role with icon
 */

import { Badge } from '@/components/ui/badge';
import { Building2, Store, User } from 'lucide-react';
import type { UserRole } from '@/types/agent-workspace';

const ROLE_CONFIG = {
    brand: {
        label: 'Brand',
        icon: Building2,
        color: 'bg-purple-500'
    },
    dispensary: {
        label: 'Dispensary',
        icon: Store,
        color: 'bg-blue-500'
    },
    owner: {
        label: 'Owner',
        icon: User,
        color: 'bg-green-500'
    },
    customer: {
        label: 'Customer',
        icon: User,
        color: 'bg-gray-500'
    }
};

interface RoleBadgeProps {
    role: UserRole;
    className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const config = ROLE_CONFIG[role];
    const Icon = config.icon;

    return (
        <Badge
            variant="secondary"
            className={className}
        >
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
        </Badge>
    );
}
