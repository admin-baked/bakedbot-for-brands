
import { UserRole, Permission } from '@/server/auth/rbac';

// ============================================================================
// 1. Tool Contracts
// ============================================================================

/**
 * Represents the fundamental capability of an agent tool.
 */
export interface ToolDefinition {
    /** Unique identifier for the tool (e.g., 'catalog.searchProducts') */
    name: string;
    description: string;

    /** Zod schema definition for input validation (stored as JSON schema or typically handled in code via libraries like Zod) */
    inputSchema: any;

    /**
     * Categories:
     * - 'read': Safe, no side effects.
     * - 'write': Mutates data but no external value (e.g. database update).
     * - 'side-effect': Sends emails, publishes pages, spends money. Requires Idempotency.
     * - 'policy': Deebo checks.
     * - 'workflow': Orchestration.
     */
    category: 'read' | 'write' | 'side-effect' | 'policy' | 'workflow';

    /** Specific permission required to execute this tool. */
    requiredPermission?: Permission;

    /** If true, this tool essentially bypasses some standard policy checks (use carefully). */
    isSystemInternal?: boolean;
}

/**
 * A request to execute a tool.
 */
export interface ToolRequest {
    toolName: string;
    /** The tenant context this tool is operating within. Nullable only for purely public directory checks. */
    tenantId: string | null;
    /** The user or agent triggering this action. */
    actor: {
        userId: string;
        role: UserRole;
        email?: string;
    };
    /**
     * Required for side-effect tools.
     * Clients should generate this (UUID v4 recommended).
     */
    idempotencyKey?: string;
    /** The actual arguments for the tool. */
    inputs: Record<string, any>;
}

/**
 * The standard response structure from ANY tool execution.
 */
export interface ToolResponse<T = any> {
    status: 'success' | 'blocked' | 'failed';
    data?: T;
    error?: string;

    /**
     * Evidence Refs: Pointers to what was touched/created.
     * e.g., ['firestore://tenants/123/products/abc', 'storage://reports/q4.pdf']
     */
    evidenceRefs?: string[];

    /** Warning messages that don't block execution but should be shown to user. */
    warnings?: string[];

    /** Deebo policy result if a check was run. */
    policyResult?: DeeboPolicyResult;
}

// ============================================================================
// 2. Audit & Governance
// ============================================================================

export interface AuditLogEntry {
    id: string; // generated
    timestamp: number;
    tenantId: string | null;
    actorId: string;
    actorRole: UserRole;
    actionType: 'tool_execution' | 'policy_check' | 'approval_request';

    details: {
        toolName?: string;
        inputs?: any;
        outputs?: any; // potentially redacted or summarized
        status: 'success' | 'blocked' | 'failed';
        error?: string;
        latencyMs: number;
    };

    // Linkage
    idempotencyKey?: string;
    policyCheckRef?: string;
}

// ============================================================================
// 3. Deebo Policy Gate
// ============================================================================

export interface DeeboPolicyResult {
    allowed: boolean;
    reason: string;

    /** If blocked, these are the specific violations. */
    violations?: string[];

    /** Specific redlines (e.g., "Don't say 'cure'", "Remove 'kids'"). */
    redlines?: string[];

    /** Suggested safe rewrite. */
    rewriteSuggestion?: string;
}

// ============================================================================
// 4. Approvals (Side Effects)
// ============================================================================

export interface ApprovalRequest {
    id: string;
    tenantId: string;
    createdAt: number;
    status: 'pending' | 'approved' | 'rejected';

    requestedBy: {
        userId: string;
        role: UserRole;
    };

    type: 'send_sms' | 'send_email' | 'publish_page' | 'update_catalog';

    description: string; // Human readable summary of what is being approved
    payloadRef: string; // Pointer to the exact data payload (often in Storage or separate doc)

    approverId?: string;
    approvedAt?: number;
    rejectionReason?: string;
}
