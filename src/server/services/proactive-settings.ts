import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
    OrgProactivePilotSettings,
    ProactivePilotSettings,
    ProactiveWorkflowKey,
    ProactiveWorkflowToggles,
} from '@/types/proactive';

export const DEFAULT_PROACTIVE_WORKFLOW_TOGGLES: ProactiveWorkflowToggles = {
    daily_dispensary_health: true,
    vip_retention_watch: true,
    competitor_pricing_watch: true,
};

export const DEFAULT_PROACTIVE_PILOT_SETTINGS: ProactivePilotSettings = {
    enabled: true,
    diagnosticsEnabled: true,
    defaultSnoozeHours: 24,
    workflows: DEFAULT_PROACTIVE_WORKFLOW_TOGGLES,
};

function toDate(value: unknown): Date | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof Date) {
        return value;
    }

    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate();
    }

    return undefined;
}

function sanitizeWorkflowToggles(input?: Partial<Record<ProactiveWorkflowKey, unknown>>): ProactiveWorkflowToggles {
    return {
        daily_dispensary_health: input?.daily_dispensary_health !== false,
        vip_retention_watch: input?.vip_retention_watch !== false,
        competitor_pricing_watch: input?.competitor_pricing_watch !== false,
    };
}

export function sanitizeProactivePilotSettings(input?: Record<string, unknown> | null): ProactivePilotSettings {
    const pilot = (input?.proactivePilot ?? input ?? {}) as Record<string, unknown>;
    return {
        enabled: pilot.enabled !== false,
        diagnosticsEnabled: pilot.diagnosticsEnabled !== false,
        defaultSnoozeHours: typeof pilot.defaultSnoozeHours === 'number' && Number.isFinite(pilot.defaultSnoozeHours)
            ? Math.max(1, Math.round(pilot.defaultSnoozeHours))
            : DEFAULT_PROACTIVE_PILOT_SETTINGS.defaultSnoozeHours,
        workflows: sanitizeWorkflowToggles(
            (pilot.workflows ?? {}) as Partial<Record<ProactiveWorkflowKey, unknown>>
        ),
    };
}

export function sanitizeOrgProactivePilotSettings(
    orgId: string,
    input?: Record<string, unknown> | null
): OrgProactivePilotSettings | null {
    if (!orgId) {
        return null;
    }

    const pilot = (input?.proactivePilot ?? input ?? null) as Record<string, unknown> | null;
    if (!pilot) {
        return null;
    }

    return {
        orgId,
        disabled: pilot.disabled === true,
        workflows: sanitizeWorkflowToggles(
            (pilot.workflows ?? {}) as Partial<Record<ProactiveWorkflowKey, unknown>>
        ),
        notes: typeof pilot.notes === 'string' ? pilot.notes : undefined,
        updatedAt: toDate(pilot.updatedAt),
        updatedBy: typeof pilot.updatedBy === 'string' ? pilot.updatedBy : undefined,
    };
}

export async function getSystemProactivePilotSettings(): Promise<ProactivePilotSettings> {
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('settings').doc('system').get();
        return sanitizeProactivePilotSettings(doc.data() as Record<string, unknown> | undefined);
    } catch (error) {
        logger.error('[ProactiveSettings] Failed to load system proactive settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_PROACTIVE_PILOT_SETTINGS;
    }
}

export async function getOrgProactivePilotSettings(orgId: string): Promise<OrgProactivePilotSettings | null> {
    if (!orgId) {
        return null;
    }

    try {
        const db = getAdminFirestore();
        const doc = await db.collection('org_settings').doc(orgId).get();
        return sanitizeOrgProactivePilotSettings(orgId, doc.data() as Record<string, unknown> | undefined);
    } catch (error) {
        logger.error('[ProactiveSettings] Failed to load org proactive settings', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

export async function resolveProactivePilotSettings(orgId?: string): Promise<{
    system: ProactivePilotSettings;
    org: OrgProactivePilotSettings | null;
}> {
    const system = await getSystemProactivePilotSettings();
    const org = orgId ? await getOrgProactivePilotSettings(orgId) : null;
    return { system, org };
}

export async function isProactiveWorkflowEnabled(
    orgId: string,
    workflowKey: ProactiveWorkflowKey
): Promise<boolean> {
    const { system, org } = await resolveProactivePilotSettings(orgId);
    if (!system.enabled) {
        return false;
    }
    if (org?.disabled) {
        return false;
    }
    if (system.workflows[workflowKey] === false) {
        return false;
    }
    if (org?.workflows && org.workflows[workflowKey] === false) {
        return false;
    }
    return true;
}

export async function getResolvedProactiveSnoozeHours(orgId: string): Promise<number> {
    const { system } = await resolveProactivePilotSettings(orgId);
    return system.defaultSnoozeHours;
}

export async function isProactiveDiagnosticsEnabled(orgId?: string): Promise<boolean> {
    const { system } = await resolveProactivePilotSettings(orgId);
    return system.diagnosticsEnabled;
}
