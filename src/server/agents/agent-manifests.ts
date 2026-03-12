import { PERSONAS, type AgentPersona } from '@/app/dashboard/ceo/agents/personas';
import type { AgentExecutionProfile, AgentRoleScope, RuntimeBackendId } from '@/types/agent-vm';
import { getDefaultRuntimeBackend } from '@/types/agent-vm';

const VM_AGENT_IDS = [
    'puff',
    'leo',
    'jack',
    'linus',
    'glenda',
    'mike_exec',
    'big_worm',
    'bigworm',
    'roach',
    'smokey',
    'pops',
    'money_mike',
    'craig',
    'deebo',
    'mrs_parker',
    'day_day',
    'ezal',
    'openclaw',
] as const satisfies readonly AgentPersona[];

const AGENT_ROLE_SCOPES: Partial<Record<AgentPersona, AgentRoleScope[]>> = {
    puff: ['super_user'],
    leo: ['super_user'],
    jack: ['super_user'],
    linus: ['super_user'],
    glenda: ['super_user'],
    mike_exec: ['super_user'],
    big_worm: ['super_user'],
    bigworm: ['super_user'],
    roach: ['super_user'],
    smokey: ['dispensary'],
    pops: ['dispensary', 'grower', 'brand'],
    money_mike: ['dispensary', 'grower'],
    craig: ['dispensary', 'brand', 'grower'],
    deebo: ['dispensary', 'brand', 'grower', 'super_user'],
    mrs_parker: ['dispensary', 'brand'],
    day_day: ['dispensary'],
    ezal: ['dispensary', 'brand'],
    openclaw: ['super_user'],
};

const ROLE_RUNTIME_BASELINES: Record<AgentRoleScope, RuntimeBackendId[]> = {
    super_user: ['analysis_js', 'browser'],
    dispensary: ['analysis_js', 'browser'],
    brand: ['analysis_js', 'browser'],
    grower: ['analysis_js', 'browser'],
};

const ROLE_MEMORY_POLICIES: Record<AgentRoleScope, string> = {
    super_user: 'thread_org_agent_execution',
    dispensary: 'thread_org_agent',
    brand: 'thread_org_brand_agent',
    grower: 'thread_org_grower_agent',
};

const ROLE_APPROVAL_POLICIES: Record<AgentRoleScope, string> = {
    super_user: 'super_user_vm_default',
    dispensary: 'dispensary_vm_default',
    brand: 'brand_vm_default',
    grower: 'grower_vm_default',
};

const ROLE_ARTIFACT_POLICIES: Record<AgentRoleScope, string> = {
    super_user: 'vm_run_default',
    dispensary: 'vm_run_default',
    brand: 'vm_run_default',
    grower: 'vm_run_default',
};

export const AGENT_EXECUTION_PROFILES: Partial<Record<AgentPersona, AgentExecutionProfile>> =
    Object.fromEntries(
        VM_AGENT_IDS.map((agentId) => {
            const persona = PERSONAS[agentId];
            const roleScopes: AgentRoleScope[] = AGENT_ROLE_SCOPES[agentId] ?? ['super_user'];
            const primaryRoleScope = roleScopes[0] ?? 'super_user';
            const runtimeBackends = resolveRuntimeBackends(agentId, roleScopes);

            return [agentId, {
                agentId,
                roleScopes,
                personaPrompt: persona?.systemPrompt,
                memoryPolicyId: ROLE_MEMORY_POLICIES[primaryRoleScope],
                defaultSkills: persona?.skills || [],
                defaultToolGroups: persona?.tools || [],
                runtimeBackends,
                approvalPolicyId: ROLE_APPROVAL_POLICIES[primaryRoleScope],
                artifactPolicyId: ROLE_ARTIFACT_POLICIES[primaryRoleScope],
            } satisfies AgentExecutionProfile];
        })
    );

export function getAgentExecutionProfile(agentId?: string | null): AgentExecutionProfile | null {
    if (!agentId) return null;
    return AGENT_EXECUTION_PROFILES[agentId as AgentPersona] || null;
}

export function getAgentExecutionProfilesForRole(roleScope: AgentRoleScope): AgentExecutionProfile[] {
    return Object.values(AGENT_EXECUTION_PROFILES).filter((profile): profile is AgentExecutionProfile =>
        !!profile && profile.roleScopes.includes(roleScope)
    );
}

function resolveRuntimeBackends(
    agentId: AgentPersona,
    roleScopes: AgentRoleScope[]
): RuntimeBackendId[] {
    const baseline = roleScopes.flatMap((scope) => ROLE_RUNTIME_BASELINES[scope]);
    const defaultBackend = getDefaultRuntimeBackend(agentId);

    return Array.from(new Set([...baseline, defaultBackend]));
}
