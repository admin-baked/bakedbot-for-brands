'use client';

import { useEffect, useState } from 'react';
import {
    getSafeOrgProactivePilotSettingsAction,
    getSafeProactiveOpsSummaryAction,
    getSafeProactivePilotSettingsAction,
    getSafeSystemSettingsAction as getSettings,
    updateSafeOrgProactivePilotSettingsAction,
    updateSafeProactivePilotSettingsAction,
    updateSafeSystemSettingsAction as updateSettings,
    type SafeEmailProvider,
    type SafeOrgProactivePilotSettings,
    type SafeProactiveOpsSummary,
    type SafeProactiveOpsSummaryFilters,
    type SafeVideoProvider,
} from '@/server/actions/super-admin/safe-settings';
import type {
    ProactivePilotSettings,
    ProactiveSeverity,
    ProactiveTaskStatus,
    ProactiveWorkflowKey,
} from '@/types/proactive';

const WORKFLOW_LABELS: Record<ProactiveWorkflowKey, string> = {
    daily_dispensary_health: 'Daily dispensary health',
    vip_retention_watch: 'VIP retention watch',
    competitor_pricing_watch: 'Competitor pricing watch',
    slow_inventory_watch: 'Slow inventory watch',
    campaign_opportunity_watch: 'Campaign opportunity watch',
    competitor_creative_watch: 'Competitor creative watch (Brand)',
    market_narrative_watch: 'Market narrative watch (Brand)',
    product_launch_prep: 'Product launch prep (Brand)',
    retail_partner_outreach_watch: 'Retail partner outreach watch (Brand)',
    executive_morning_intelligence: 'Executive morning intelligence',
    pipeline_risk_watch: 'Pipeline risk watch',
    yield_anomaly_watch: 'Yield anomaly watch (Grower)',
    wholesale_availability_prep: 'Wholesale availability prep (Grower)',
};

const TASK_STATUS_LABELS: Record<'all' | ProactiveTaskStatus, string> = {
    all: 'All statuses',
    detected: 'Detected',
    triaged: 'Triaged',
    investigating: 'Investigating',
    draft_ready: 'Draft ready',
    awaiting_approval: 'Awaiting approval',
    approved: 'Approved',
    executing: 'Executing',
    executed: 'Executed',
    blocked: 'Blocked',
    resolved: 'Resolved',
    expired: 'Expired',
    dismissed: 'Dismissed',
};

const SEVERITY_LABELS: Record<'all' | ProactiveSeverity, string> = {
    all: 'All severities',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
};

type OpsFilterValue<T extends string> = T | 'all';

interface OpsFilterState {
    workflowKey: OpsFilterValue<ProactiveWorkflowKey>;
    taskStatus: OpsFilterValue<ProactiveTaskStatus>;
    severity: OpsFilterValue<ProactiveSeverity>;
}

const DEFAULT_OPS_FILTERS: OpsFilterState = {
    workflowKey: 'all',
    taskStatus: 'all',
    severity: 'all',
};

function buildOpsSummaryInput(
    orgId: string | undefined,
    filters: OpsFilterState
): ({ orgId?: string } & SafeProactiveOpsSummaryFilters) | undefined {
    const payload: { orgId?: string } & SafeProactiveOpsSummaryFilters = {};

    if (orgId) {
        payload.orgId = orgId;
    }

    if (filters.workflowKey !== 'all') {
        payload.workflowKey = filters.workflowKey;
    }

    if (filters.taskStatus !== 'all') {
        payload.taskStatus = filters.taskStatus;
    }

    if (filters.severity !== 'all') {
        payload.severity = filters.severity;
    }

    return Object.keys(payload).length > 0 ? payload : undefined;
}

function hasActiveOpsFilters(filters: OpsFilterState): boolean {
    return filters.workflowKey !== 'all' || filters.taskStatus !== 'all' || filters.severity !== 'all';
}

function createDefaultOrgSettings(orgId: string): SafeOrgProactivePilotSettings {
    return {
        orgId,
        disabled: false,
        workflows: {
            daily_dispensary_health: true,
            vip_retention_watch: true,
            competitor_pricing_watch: true,
            slow_inventory_watch: false,
            campaign_opportunity_watch: false,
            competitor_creative_watch: false,
            market_narrative_watch: false,
            product_launch_prep: false,
            retail_partner_outreach_watch: false,
            executive_morning_intelligence: false,
            pipeline_risk_watch: false,
            yield_anomaly_watch: false,
            wholesale_availability_prep: false,
        },
        notes: '',
    };
}

export default function CeoSettingsTab() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingSystem, setSavingSystem] = useState(false);
    const [savingPilot, setSavingPilot] = useState(false);
    const [savingOrg, setSavingOrg] = useState(false);
    const [loadingOps, setLoadingOps] = useState(false);

    const [emailProvider, setEmailProvider] = useState<SafeEmailProvider>('sendgrid');
    const [videoProvider, setVideoProvider] = useState<SafeVideoProvider>('kling');
    const [proactivePilot, setProactivePilot] = useState<ProactivePilotSettings>({
        enabled: true,
        diagnosticsEnabled: true,
        defaultSnoozeHours: 24,
        workflows: {
            daily_dispensary_health: true,
            vip_retention_watch: true,
            competitor_pricing_watch: true,
            slow_inventory_watch: false,
            campaign_opportunity_watch: false,
            competitor_creative_watch: false,
            market_narrative_watch: false,
            product_launch_prep: false,
            retail_partner_outreach_watch: false,
            executive_morning_intelligence: false,
            pipeline_risk_watch: false,
            yield_anomaly_watch: false,
            wholesale_availability_prep: false,
        },
    });
    const [opsSummary, setOpsSummary] = useState<SafeProactiveOpsSummary | null>(null);
    const [opsFilters, setOpsFilters] = useState<OpsFilterState>(DEFAULT_OPS_FILTERS);
    const [orgIdInput, setOrgIdInput] = useState('');
    const [orgSettings, setOrgSettings] = useState<SafeOrgProactivePilotSettings | null>(null);

    async function loadAll(orgId?: string, filters: OpsFilterState = opsFilters) {
        setLoadingOps(true);
        try {
            const [settings, pilotSettings, summary] = await Promise.all([
                getSettings(),
                getSafeProactivePilotSettingsAction(),
                getSafeProactiveOpsSummaryAction(buildOpsSummaryInput(orgId, filters)),
            ]);

            setEmailProvider(settings.emailProvider);
            setVideoProvider(settings.videoProvider);
            setProactivePilot(pilotSettings);
            setOpsSummary(summary);
            setOrgSettings(summary.orgSettings);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
            setLoadingOps(false);
        }
    }

    useEffect(() => {
        setMounted(true);
        void loadAll();
    }, []);

    const applyOpsFilters = async (nextFilters: OpsFilterState) => {
        setOpsFilters(nextFilters);
        await loadAll(orgIdInput.trim() || undefined, nextFilters);
    };

    if (!mounted) {
        return <div style={{ padding: 20 }}>Loading System Settings...</div>;
    }

    const handleSaveSystem = async () => {
        setSavingSystem(true);
        try {
            await updateSettings({ emailProvider, videoProvider });
            alert('System settings saved successfully.');
        } catch (error) {
            console.error('Failed to save system settings:', error);
            alert('Error saving system settings. Check console.');
        } finally {
            setSavingSystem(false);
        }
    };

    const handleSavePilot = async () => {
        setSavingPilot(true);
        try {
            await updateSafeProactivePilotSettingsAction(proactivePilot);
            await loadAll(orgSettings?.orgId);
            alert('Proactive pilot settings saved successfully.');
        } catch (error) {
            console.error('Failed to save proactive pilot settings:', error);
            alert('Error saving proactive pilot settings. Check console.');
        } finally {
            setSavingPilot(false);
        }
    };

    const handleLoadOrg = async () => {
        const orgId = orgIdInput.trim();
        if (!orgId) {
            alert('Enter an org ID first.');
            return;
        }

        setLoadingOps(true);
        try {
            const [loadedOrgSettings, summary] = await Promise.all([
                getSafeOrgProactivePilotSettingsAction(orgId),
                getSafeProactiveOpsSummaryAction(buildOpsSummaryInput(orgId, opsFilters)),
            ]);

            setOrgSettings(loadedOrgSettings ?? createDefaultOrgSettings(orgId));
            setOpsSummary(summary);
        } catch (error) {
            console.error('Failed to load org proactive settings:', error);
            alert('Error loading org proactive settings. Check console.');
        } finally {
            setLoadingOps(false);
        }
    };

    const handleSaveOrg = async () => {
        const orgId = orgIdInput.trim();
        if (!orgId) {
            alert('Enter an org ID first.');
            return;
        }

        const nextOrgSettings = orgSettings ?? createDefaultOrgSettings(orgId);
        setSavingOrg(true);
        try {
            await updateSafeOrgProactivePilotSettingsAction({
                orgId,
                disabled: nextOrgSettings.disabled,
                workflows: nextOrgSettings.workflows,
                notes: nextOrgSettings.notes,
            });
            await loadAll(orgId);
            alert('Org proactive settings saved successfully.');
        } catch (error) {
            console.error('Failed to save org proactive settings:', error);
            alert('Error saving org proactive settings. Check console.');
        } finally {
            setSavingOrg(false);
        }
    };

    const updateWorkflowToggle = (
        scope: 'global' | 'org',
        workflowKey: ProactiveWorkflowKey,
        enabled: boolean
    ) => {
        if (scope === 'global') {
            setProactivePilot((current) => ({
                ...current,
                workflows: {
                    ...current.workflows,
                    [workflowKey]: enabled,
                },
            }));
            return;
        }

        setOrgSettings((current) => {
            const base = current ?? createDefaultOrgSettings(orgIdInput.trim() || 'org_id');
            return {
                ...base,
                workflows: {
                    ...base.workflows,
                    [workflowKey]: enabled,
                },
            };
        });
    };

    if (loading) {
        return <div style={{ padding: 20 }}>Loading Settings...</div>;
    }

    return (
        <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', display: 'grid', gap: 20 }}>
            <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>System Settings</h2>
                <p style={{ color: '#666', margin: 0 }}>
                    Global runtime controls for providers, proactive pilot guardrails, and operator visibility.
                </p>
            </div>

            <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Provider Settings</h3>
                <p style={{ color: '#666', marginTop: 0 }}>Keep the existing delivery infrastructure explicit and easy to swap.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8 }}>
                        <h4 style={{ marginTop: 0 }}>Video Provider</h4>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {(['kling', 'wan', 'remotion', 'veo', 'sora', 'sora-pro'] as SafeVideoProvider[]).map((provider) => (
                                <label key={provider} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        checked={videoProvider === provider}
                                        onChange={() => setVideoProvider(provider)}
                                    />
                                    <span>{provider}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8 }}>
                        <h4 style={{ marginTop: 0 }}>Email Provider</h4>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {(['sendgrid', 'mailjet'] as SafeEmailProvider[]).map((provider) => (
                                <label key={provider} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        checked={emailProvider === provider}
                                        onChange={() => setEmailProvider(provider)}
                                    />
                                    <span>{provider}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button
                        onClick={handleSaveSystem}
                        disabled={savingSystem}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'black',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            opacity: savingSystem ? 0.7 : 1,
                            cursor: savingSystem ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {savingSystem ? 'Saving...' : 'Save Provider Settings'}
                    </button>
                </div>
            </section>

            <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Proactive Pilot Controls</h3>
                <p style={{ color: '#666', marginTop: 0 }}>
                    Firestore-first guardrails for enabling workflows, diagnostics, and default operator snoozes.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={proactivePilot.enabled}
                            onChange={(event) => setProactivePilot((current) => ({ ...current, enabled: event.target.checked }))}
                        />
                        <span>Global proactive enabled</span>
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={proactivePilot.diagnosticsEnabled}
                            onChange={(event) => setProactivePilot((current) => ({ ...current, diagnosticsEnabled: event.target.checked }))}
                        />
                        <span>Runtime diagnostics enabled</span>
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>Default snooze hours</span>
                        <input
                            type="number"
                            min={1}
                            value={proactivePilot.defaultSnoozeHours}
                            onChange={(event) => setProactivePilot((current) => ({
                                ...current,
                                defaultSnoozeHours: Math.max(1, Number(event.target.value) || 1),
                            }))}
                            style={{ width: 72, padding: 6 }}
                        />
                    </label>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                    {Object.entries(WORKFLOW_LABELS).map(([workflowKey, label]) => (
                        <label
                            key={workflowKey}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                            }}
                        >
                            <span>{label}</span>
                            <input
                                type="checkbox"
                                checked={proactivePilot.workflows[workflowKey as ProactiveWorkflowKey]}
                                onChange={(event) => updateWorkflowToggle('global', workflowKey as ProactiveWorkflowKey, event.target.checked)}
                            />
                        </label>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button
                        onClick={handleSavePilot}
                        disabled={savingPilot}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#14532d',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            opacity: savingPilot ? 0.7 : 1,
                            cursor: savingPilot ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {savingPilot ? 'Saving...' : 'Save Proactive Pilot Controls'}
                    </button>
                </div>
            </section>

            <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Org Kill Switches</h3>
                <p style={{ color: '#666', marginTop: 0 }}>
                    Load an org to pause the whole proactive runtime or disable a single workflow without changing global defaults.
                </p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                        value={orgIdInput}
                        onChange={(event) => setOrgIdInput(event.target.value)}
                        placeholder="Enter orgId"
                        style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <button
                        onClick={handleLoadOrg}
                        disabled={loadingOps}
                        style={{
                            padding: '10px 16px',
                            borderRadius: 6,
                            border: '1px solid #111827',
                            background: 'white',
                            cursor: loadingOps ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loadingOps ? 'Loading...' : 'Load Org'}
                    </button>
                </div>

                {orgSettings && (
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={orgSettings.disabled}
                                onChange={(event) => setOrgSettings((current) => current ? { ...current, disabled: event.target.checked } : current)}
                            />
                            <span>Disable all proactive workflows for {orgSettings.orgId}</span>
                        </label>

                        {Object.entries(WORKFLOW_LABELS).map(([workflowKey, label]) => (
                            <label
                                key={workflowKey}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 12,
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                }}
                            >
                                <span>{label}</span>
                                <input
                                    type="checkbox"
                                    checked={orgSettings.workflows[workflowKey as ProactiveWorkflowKey] ?? true}
                                    onChange={(event) => updateWorkflowToggle('org', workflowKey as ProactiveWorkflowKey, event.target.checked)}
                                />
                            </label>
                        ))}

                        <label style={{ display: 'grid', gap: 6 }}>
                            <span>Operator notes</span>
                            <textarea
                                value={orgSettings.notes ?? ''}
                                onChange={(event) => setOrgSettings((current) => current ? { ...current, notes: event.target.value } : current)}
                                rows={3}
                                style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
                            />
                        </label>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#666', fontSize: 12 }}>
                                {orgSettings.updatedAt ? `Last updated ${new Date(orgSettings.updatedAt).toLocaleString()}` : 'No org override saved yet'}
                            </span>
                            <button
                                onClick={handleSaveOrg}
                                disabled={savingOrg}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#1d4ed8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    opacity: savingOrg ? 0.7 : 1,
                                    cursor: savingOrg ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {savingOrg ? 'Saving...' : 'Save Org Override'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Operator Snapshot</h3>
                        <p style={{ color: '#666', marginTop: 0 }}>
                            Live pilot view of proactive tasks, commitments, outcomes, and fallback diagnostics.
                        </p>
                    </div>
                    <button
                        onClick={() => loadAll(orgIdInput.trim() || undefined, opsFilters)}
                        disabled={loadingOps}
                        style={{
                            padding: '10px 16px',
                            borderRadius: 6,
                            border: '1px solid #111827',
                            background: 'white',
                            cursor: loadingOps ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loadingOps ? 'Refreshing...' : 'Refresh Snapshot'}
                    </button>
                </div>

                {opsSummary && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div
                            style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: 16,
                                display: 'grid',
                                gap: 12,
                            }}
                        >
                            <div>
                                <h4 style={{ marginTop: 0, marginBottom: 6 }}>Task Triage Filters</h4>
                                <p style={{ color: '#666', margin: 0 }}>
                                    Keep the overview global, then narrow the task queue by workflow, status, or severity.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                                <label style={{ display: 'grid', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#666' }}>Workflow</span>
                                    <select
                                        value={opsFilters.workflowKey}
                                        onChange={(event) =>
                                            void applyOpsFilters({
                                                ...opsFilters,
                                                workflowKey: event.target.value as OpsFilterState['workflowKey'],
                                            })
                                        }
                                        style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
                                    >
                                        <option value="all">All workflows</option>
                                        {Object.entries(WORKFLOW_LABELS).map(([workflowKey, label]) => (
                                            <option key={workflowKey} value={workflowKey}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label style={{ display: 'grid', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#666' }}>Status</span>
                                    <select
                                        value={opsFilters.taskStatus}
                                        onChange={(event) =>
                                            void applyOpsFilters({
                                                ...opsFilters,
                                                taskStatus: event.target.value as OpsFilterState['taskStatus'],
                                            })
                                        }
                                        style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
                                    >
                                        {Object.entries(TASK_STATUS_LABELS).map(([status, label]) => (
                                            <option key={status} value={status}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label style={{ display: 'grid', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#666' }}>Severity</span>
                                    <select
                                        value={opsFilters.severity}
                                        onChange={(event) =>
                                            void applyOpsFilters({
                                                ...opsFilters,
                                                severity: event.target.value as OpsFilterState['severity'],
                                            })
                                        }
                                        style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
                                    >
                                        {Object.entries(SEVERITY_LABELS).map(([severity, label]) => (
                                            <option key={severity} value={severity}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <div style={{ display: 'grid', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#666' }}>Current scope</span>
                                    <button
                                        onClick={() => void applyOpsFilters(DEFAULT_OPS_FILTERS)}
                                        disabled={loadingOps || !hasActiveOpsFilters(opsFilters)}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: 6,
                                            border: '1px solid #111827',
                                            background: 'white',
                                            cursor: loadingOps || !hasActiveOpsFilters(opsFilters) ? 'not-allowed' : 'pointer',
                                            opacity: loadingOps || !hasActiveOpsFilters(opsFilters) ? 0.6 : 1,
                                        }}
                                    >
                                        Clear task filters
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#374151' }}>
                                <span>{opsSummary.filteredCounts.matchingTasks} matching tasks</span>
                                <span>{opsSummary.filteredCounts.matchingOpenTasks} still open</span>
                                <span>{opsSummary.filteredCounts.matchingAwaitingApprovalTasks} awaiting approval</span>
                                <span>{opsSummary.filteredCounts.matchingBlockedTasks} blocked</span>
                                <span>{opsSummary.filteredCounts.matchingCriticalTasks} critical</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                            {[
                                ['Open tasks', opsSummary.counts.openTasks],
                                ['Draft ready', opsSummary.counts.draftReadyTasks],
                                ['Awaiting approval', opsSummary.counts.awaitingApprovalTasks],
                                ['Open commitments', opsSummary.counts.openCommitments],
                                ['Approvals (7d)', opsSummary.counts.approvalsLast7Days],
                                ['Dismissals (7d)', opsSummary.counts.dismissalsLast7Days],
                                ['Outcomes (7d)', opsSummary.counts.outcomesLast7Days],
                                ['Fallbacks (7d)', opsSummary.counts.fallbackEventsLast7Days],
                            ].map(([label, value]) => (
                                <div key={label} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                                    <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                            <h4 style={{ marginTop: 0 }}>Workflow Health</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                                {opsSummary.workflowSummaries.map((summary) => (
                                    <div key={summary.workflowKey} style={{ border: '1px solid #f3f4f6', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontWeight: 600 }}>{WORKFLOW_LABELS[summary.workflowKey]}</div>
                                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                            {summary.lastTaskUpdatedAt
                                                ? `Last task ${new Date(summary.lastTaskUpdatedAt).toLocaleString()}`
                                                : 'No task activity recorded yet'}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#374151', marginTop: 10, display: 'grid', gap: 4 }}>
                                            <span>Open {summary.openTasks} | Draft ready {summary.draftReadyTasks}</span>
                                            <span>Awaiting approval {summary.awaitingApprovalTasks} | Open commitments {summary.openCommitments}</span>
                                            <span>Approvals 7d {summary.approvalsLast7Days} | Dismissals 7d {summary.dismissalsLast7Days}</span>
                                            <span>Snoozes 7d {summary.snoozesLast7Days} | Executions 7d {summary.executionsLast7Days}</span>
                                            <span>Resolved 7d {summary.resolvedLast7Days} | Fallbacks 7d {summary.fallbackEventsLast7Days}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                            <h4 style={{ marginTop: 0 }}>Runtime Path Health</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                {opsSummary.diagnosticSourceSummaries.length === 0 && (
                                    <span style={{ color: '#666' }}>No runtime diagnostics recorded yet.</span>
                                )}
                                {opsSummary.diagnosticSourceSummaries.map((summary) => (
                                    <div key={`${summary.source}-${summary.workflowKey || 'runtime'}`} style={{ border: '1px solid #f3f4f6', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontWeight: 600 }}>
                                            {summary.source} | {summary.workflowKey ? WORKFLOW_LABELS[summary.workflowKey] : 'Shared runtime'}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                            Indexed 7d {summary.indexedEventsLast7Days} | Fallbacks 7d {summary.fallbackEventsLast7Days}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                            {summary.lastSeenAt ? `Last seen ${new Date(summary.lastSeenAt).toLocaleString()}` : 'No recent activity'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                <h4 style={{ marginTop: 0 }}>Recent Tasks</h4>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {opsSummary.recentTasks.length === 0 && (
                                        <span style={{ color: '#666' }}>
                                            {hasActiveOpsFilters(opsFilters)
                                                ? 'No proactive tasks match the current filters.'
                                                : 'No proactive tasks yet.'}
                                        </span>
                                    )}
                                    {opsSummary.recentTasks.map((task) => (
                                        <div key={task.id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                                            <div style={{ fontWeight: 600 }}>{task.title}</div>
                                            <div style={{ fontSize: 12, color: '#666' }}>
                                                {task.workflowKey} • {task.status} • {task.severity} • {new Date(task.updatedAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                <h4 style={{ marginTop: 0 }}>Open Commitments</h4>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {opsSummary.recentCommitments.length === 0 && <span style={{ color: '#666' }}>No proactive commitments yet.</span>}
                                    {opsSummary.recentCommitments.map((commitment) => (
                                        <div key={commitment.id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                                            <div style={{ fontWeight: 600 }}>{commitment.title}</div>
                                            <div style={{ fontSize: 12, color: '#666' }}>
                                                {commitment.state} • {commitment.dueAt ? new Date(commitment.dueAt).toLocaleString() : 'No due date'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                <h4 style={{ marginTop: 0 }}>Recent Outcomes</h4>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {opsSummary.recentOutcomes.length === 0 && <span style={{ color: '#666' }}>No proactive outcomes yet.</span>}
                                    {opsSummary.recentOutcomes.map((outcome) => (
                                        <div key={outcome.id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                                            <div style={{ fontWeight: 600 }}>{outcome.workflowKey}</div>
                                            <div style={{ fontSize: 12, color: '#666' }}>
                                                {outcome.outcomeType} • {new Date(outcome.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                                <h4 style={{ marginTop: 0 }}>Query Diagnostics</h4>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {opsSummary.diagnostics.length === 0 && <span style={{ color: '#666' }}>No runtime diagnostics recorded yet.</span>}
                                    {opsSummary.diagnostics.map((diagnostic) => (
                                        <div key={diagnostic.id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                                            <div style={{ fontWeight: 600 }}>
                                                {diagnostic.source} • {diagnostic.mode}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#666' }}>
                                                {diagnostic.workflowKey || 'runtime'} • {new Date(diagnostic.createdAt).toLocaleString()}
                                            </div>
                                            {diagnostic.message && (
                                                <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
                                                    {diagnostic.message}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
