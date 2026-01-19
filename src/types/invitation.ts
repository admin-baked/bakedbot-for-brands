
import { z } from 'zod';

import { UserRole, ROLES } from './roles';

export type InvitationRole = UserRole;
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
    id: string;
    email: string;
    role: InvitationRole;
    targetOrgId?: string; // Optional: Only for brand/dispensary invites (context)
    invitedBy: string; // User ID of the inviter
    status: InvitationStatus;
    token: string; // Secure token for the invite link
    
    // Tracking
    createdAt: Date;
    expiresAt: Date;
    acceptedAt?: Date;
    acceptedBy?: string; // User ID of the person who accepted
}

// --- Zod Schemas ---

export const CreateInvitationSchema = z.object({
    email: z.string().email(),
    role: z.enum(ROLES), // Use the tuple from roles.ts if available, else standard Zod enum
    targetOrgId: z.string().optional(), // Required if role is brand/dispensary
});

export const AcceptInvitationSchema = z.object({
    token: z.string(),
});
