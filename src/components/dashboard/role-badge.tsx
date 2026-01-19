'use client';

/**
 * Role Badge Component
 * Shows user's role with icon
 */

import { Badge } from '@/components/ui/badge';
import { Building2, Store, User, Shield, UserCog, Users } from 'lucide-react';
import type { UserRole } from '@/types/roles';

interface RoleConfig {
    label: string;
    icon: typeof Building2;
    color: string;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
    // Brand roles
    brand: {
        label: 'Brand',
        icon: Building2,
        color: 'bg-purple-500'
    },
    brand_admin: {
        label: 'Brand Admin',
        icon: Building2,
        color: 'bg-purple-600'
    },
    brand_member: {
        label: 'Brand Member',
        icon: Building2,
        color: 'bg-purple-400'
    },
    
    // Dispensary roles
    dispensary: {
        label: 'Dispensary',
        icon: Store,
        color: 'bg-blue-500'
    },
    dispensary_admin: {
        label: 'Dispensary Admin',
        icon: Store,
        color: 'bg-blue-600'
    },
    dispensary_staff: {
        label: 'Staff',
        icon: Users,
        color: 'bg-blue-400'
    },
    
    // Platform roles
    owner: {
        label: 'Owner',
        icon: UserCog,
        color: 'bg-green-500'
    },
    super_admin: {
        label: 'Super Admin',
        icon: Shield,
        color: 'bg-red-500'
    },
    super_user: {
        label: 'Super User',
        icon: Shield,
        color: 'bg-blue-600'
    },
    
    // Consumer roles
    customer: {
        label: 'Customer',
        icon: User,
        color: 'bg-gray-500'
    },
    budtender: {
        label: 'Budtender',
        icon: User,
        color: 'bg-green-600'
    }
};

// Default config for unknown roles
const DEFAULT_CONFIG: RoleConfig = {
    label: 'User',
    icon: User,
    color: 'bg-gray-400'
};

interface RoleBadgeProps {
    role: UserRole | string;
    className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const config = ROLE_CONFIG[role] || DEFAULT_CONFIG;
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
