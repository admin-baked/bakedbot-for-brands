/**
 * Secure Credential Vault
 * Stores encrypted login credentials for Computer Use
 */

export interface SecureCredential {
    id: string;
    name: string;
    domain: string; // e.g., "shopify.com"
    username: string;
    encryptedPassword: string; // AES-256 encrypted, decrypted server-side only
    lastUsed?: Date;
    createdAt: Date;
    createdBy: string; // userId
    orgId: string;

    // Permission tracking
    autoApproved: boolean; // User selected "Always allow"
    usageCount: number;
}

export interface CredentialPermissionRequest {
    credentialId: string;
    domain: string;
    action: 'login' | 'download' | 'submit_form';
    requestedBy: string; // agentId
    requestedAt: Date;
}

export interface CredentialPermissionDecision {
    requestId: string;
    approved: boolean;
    rememberChoice: boolean; // "Always allow for this domain"
    decidedAt: Date;
    decidedBy: string; // userId
}
