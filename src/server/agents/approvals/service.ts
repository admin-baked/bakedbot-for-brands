import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { UserRole } from '@/server/auth/rbac';
import type { ApprovalRequest } from '@/types/agent-toolkit';
import { v4 as uuidv4 } from 'uuid';

interface ApprovalMetadataInput {
    taskId?: string;
    requestedByAgent?: string;
    rationale?: string;
    riskClass?: ApprovalRequest['riskClass'];
    evidenceRefs?: string[];
    expiresAt?: number;
}

interface CreateApprovalRequestInput {
    tenantId: string;
    toolName: string;
    inputs: Record<string, unknown>;
    actorId: string;
    actorRole: UserRole;
    options?: ApprovalMetadataInput;
}

function sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeValue(entry));
    }

    if (value && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            if (entry !== undefined) {
                sanitized[key] = sanitizeValue(entry);
            }
        }
        return sanitized;
    }

    return value;
}

function normalizeCreateApprovalInput(
    inputOrTenantId: CreateApprovalRequestInput | string,
    toolName?: string,
    inputs?: Record<string, unknown>,
    actorId?: string,
    actorRole?: UserRole,
    options?: ApprovalMetadataInput
): CreateApprovalRequestInput {
    if (typeof inputOrTenantId === 'object') {
        return inputOrTenantId;
    }

    if (!toolName || !inputs || !actorId || !actorRole) {
        throw new Error('Missing required approval request fields');
    }

    return {
        tenantId: inputOrTenantId,
        toolName,
        inputs,
        actorId,
        actorRole,
        options,
    };
}

function buildApprovalRequest(input: CreateApprovalRequestInput, id: string): ApprovalRequest {
    const request: ApprovalRequest = {
        id,
        tenantId: input.tenantId,
        createdAt: Date.now(),
        status: 'pending',
        toolName: input.toolName,
        requestedBy: {
            userId: input.actorId,
            role: input.actorRole,
        },
        type: mapToolToApprovalType(input.toolName),
        description: `Request to execute ${input.toolName}`,
        payloadRef: `tenants/${input.tenantId}/approvals/${id}/payload`,
    };

    if (input.options?.taskId) {
        request.taskId = input.options.taskId;
    }
    if (input.options?.requestedByAgent) {
        request.requestedByAgent = input.options.requestedByAgent;
    }
    if (input.options?.rationale) {
        request.rationale = input.options.rationale;
    }
    if (input.options?.riskClass) {
        request.riskClass = input.options.riskClass;
    }
    if (input.options?.evidenceRefs?.length) {
        request.evidenceRefs = [...input.options.evidenceRefs];
    }
    if (input.options?.expiresAt) {
        request.expiresAt = input.options.expiresAt;
    }

    return request;
}

export async function createApprovalRequest(
    input: CreateApprovalRequestInput
): Promise<ApprovalRequest>;
export async function createApprovalRequest(
    tenantId: string,
    toolName: string,
    inputs: Record<string, unknown>,
    actorId: string,
    actorRole: UserRole,
    options?: ApprovalMetadataInput
): Promise<ApprovalRequest>;
export async function createApprovalRequest(
    inputOrTenantId: CreateApprovalRequestInput | string,
    toolName?: string,
    inputs?: Record<string, unknown>,
    actorId?: string,
    actorRole?: UserRole,
    options?: ApprovalMetadataInput
): Promise<ApprovalRequest> {
    const input = normalizeCreateApprovalInput(
        inputOrTenantId,
        toolName,
        inputs,
        actorId,
        actorRole,
        options
    );
    const { firestore } = await createServerClient();
    const id = uuidv4();
    const request = buildApprovalRequest(input, id);
    const sanitizedInputs = sanitizeValue(input.inputs) as Record<string, unknown>;

    // Store the request + inputs
    const batch = firestore.batch();
    const reqRef = firestore.doc(`tenants/${input.tenantId}/approvals/${id}`);
    batch.set(reqRef, request);

    // Store the actual inputs safely
    const payloadRef = reqRef.collection('payload').doc('data');
    batch.set(payloadRef, { inputs: sanitizedInputs });

    await batch.commit();

    logger.info('[AgentApprovalService] Created approval request', {
        approvalId: request.id,
        tenantId: request.tenantId,
        toolName: request.toolName,
        taskId: request.taskId,
        requestedByAgent: request.requestedByAgent,
        riskClass: request.riskClass,
    });

    return request;
}

export async function getApprovalRequest(
    tenantId: string,
    approvalId: string
): Promise<ApprovalRequest | null> {
    if (!tenantId || !approvalId) {
        return null;
    }

    const { firestore } = await createServerClient();
    const doc = await firestore.doc(`tenants/${tenantId}/approvals/${approvalId}`).get();
    return doc.exists ? (doc.data() as ApprovalRequest) : null;
}

export async function getApprovalPayload(
    tenantId: string,
    approvalId: string
): Promise<Record<string, unknown> | null> {
    if (!tenantId || !approvalId) {
        return null;
    }

    const { firestore } = await createServerClient();
    const doc = await firestore
        .doc(`tenants/${tenantId}/approvals/${approvalId}/payload/data`)
        .get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data() as { inputs?: Record<string, unknown> } | undefined;
    return (sanitizeValue(data?.inputs ?? null) as Record<string, unknown> | null);
}

function mapToolToApprovalType(toolName: string): ApprovalRequest['type'] {
    if (toolName.includes('marketing')) return 'send_email'; // or 'send_sms'
    if (toolName.includes('publish')) return 'publish_page';
    return 'update_catalog'; // default fallback
}

export async function checkIdempotency(key: string): Promise<any | null> {
    if (!key) return null;
    const { firestore } = await createServerClient();
    const doc = await firestore.doc(`system/tools/idempotency/${key}`).get();
    return doc.exists ? doc.data() : null;
}

export async function saveIdempotency(key: string, result: any) {
    if (!key) return;
    const { firestore } = await createServerClient();
    // basic expiry would be good here (TTL)
    await firestore.doc(`system/tools/idempotency/${key}`).set({
        result,
        timestamp: Date.now()
    });
}
