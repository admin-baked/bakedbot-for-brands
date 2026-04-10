import type { ApprovalLevel, ApprovalState } from '@/types/creative-content';
import {
    isBrandRole,
    isDispensaryRole,
    normalizeRole,
    type UserRole,
} from '@/types/roles';

export type CreativeApprovalWorkflowType = 'super_user_boardroom' | 'operational_deebo';

interface CreativeApprovalWorkflow {
    workflowType: CreativeApprovalWorkflowType;
    levels: ApprovalLevel[];
}

function getOperationalApprovalRoles(role: UserRole): string[] {
    if (isBrandRole(role)) {
        return ['brand_admin', 'super_user'];
    }

    if (isDispensaryRole(role)) {
        return ['dispensary_admin', 'super_user'];
    }

    return ['super_user'];
}

export function getCreativeApprovalWorkflow(role: string | null | undefined): CreativeApprovalWorkflow {
    const normalizedRole = normalizeRole(role ?? null);

    if (normalizedRole === 'super_user') {
        return {
            workflowType: 'super_user_boardroom',
            levels: [
                {
                    level: 1,
                    name: 'Marty Strategic Review',
                    reviewAgentId: 'marty',
                    description: 'Boardroom review for strategic fit, operator value, and launch readiness.',
                    requiredRoles: ['super_user'],
                    minimumApprovals: 1,
                    canOverride: false,
                },
                {
                    level: 2,
                    name: 'Linus Mission Check',
                    reviewAgentId: 'linus',
                    description: 'Final Super User mission-ready check before publishing or scheduling.',
                    requiredRoles: ['super_user'],
                    minimumApprovals: 1,
                    canOverride: true,
                },
            ],
        };
    }

    return {
        workflowType: 'operational_deebo',
        levels: [
            {
                level: 1,
                name: 'Deebo Compliance Approval',
                reviewAgentId: 'deebo',
                description: 'Deebo owns the compliance gate for brand and dispensary teams before release.',
                requiredRoles: getOperationalApprovalRoles(normalizedRole),
                minimumApprovals: 1,
                canOverride: false,
            },
        ],
    };
}

export function createInitialCreativeApprovalState(
    role: string | null | undefined,
    chainId?: string,
): ApprovalState {
    const workflow = getCreativeApprovalWorkflow(role);
    const [firstLevel] = workflow.levels;

    return {
        chainId,
        workflowType: workflow.workflowType,
        levels: workflow.levels,
        currentLevel: firstLevel.level,
        approvals: [],
        status: 'pending_approval',
        nextRequiredRoles: firstLevel.requiredRoles,
    };
}

export function resetCreativeApprovalState(
    approvalState: ApprovalState | undefined,
    fallbackRole: string | null | undefined,
): ApprovalState {
    if (!approvalState?.levels?.length) {
        return createInitialCreativeApprovalState(fallbackRole, approvalState?.chainId);
    }

    const [firstLevel] = approvalState.levels;

    return {
        chainId: approvalState.chainId,
        workflowType: approvalState.workflowType,
        levels: approvalState.levels,
        currentLevel: firstLevel.level,
        approvals: [],
        status: 'pending_approval',
        nextRequiredRoles: firstLevel.requiredRoles,
    };
}

export function getApprovalLevelConfig(
    approvalState: ApprovalState | undefined,
    level: number,
): ApprovalLevel | undefined {
    return approvalState?.levels?.find((entry) => entry.level === level);
}

export function isApprovalWorkflowSatisfied(approvalState: ApprovalState | undefined): boolean {
    if (!approvalState) {
        return true;
    }

    return approvalState.status === 'approved';
}
