'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle, SkipForward, Loader2, ChevronDown, ChevronRight, Zap, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { provisionOrg, setOrgSubdomain, type ProvisionResult, type ProvisionStep } from '@/server/actions/admin/provision-org';
import { setOrgPlan, type PlanId } from '@/server/actions/admin/set-org-plan';

interface OrgRow {
    id: string;
    name: string;
    type: string;
    bakedBotSubdomain?: string;
    provisioning?: Record<string, unknown>;
    subscriptionStatus: string;
    planId?: string;
}

interface Props {
    orgs: OrgRow[];
}

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    none: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    past_due: 'bg-amber-100 text-amber-800',
    canceled: 'bg-red-100 text-red-700',
};

function StepIcon({ status }: { status: ProvisionStep['status'] }) {
    if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    if (status === 'skipped') return <SkipForward className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    return <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />;
}

function SubdomainEditor({ org, onSaved }: { org: OrgRow; onSaved: (sub: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(org.bakedBotSubdomain ?? '');
    const [saving, startSave] = useTransition();
    const [error, setError] = useState('');

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
                {org.bakedBotSubdomain
                    ? <><span className="font-mono text-blue-600 dark:text-blue-400">{org.bakedBotSubdomain}.bakedbot.ai</span><Pencil className="h-3 w-3" /></>
                    : <><span className="text-amber-500">No subdomain</span><Pencil className="h-3 w-3" /></>
                }
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. thrive"
                className="text-xs border rounded px-2 py-0.5 w-28 font-mono bg-background"
            />
            <span className="text-xs text-muted-foreground">.bakedbot.ai</span>
            <button
                disabled={saving || !value}
                onClick={() => startSave(async () => {
                    setError('');
                    const res = await setOrgSubdomain(org.id, value);
                    if (res.success) { onSaved(value); setEditing(false); }
                    else setError(res.error ?? 'Failed');
                })}
                className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
                {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    );
}

const PLANS: { id: PlanId; label: string }[] = [
    { id: 'free', label: 'Free Check-In ($0)' },
    { id: 'access_intel', label: 'Access Intel ($149/mo)' },
    { id: 'access_retention', label: 'Access Retention ($499/mo)' },
    { id: 'access_complete', label: 'Access Complete ($750/mo)' },
    { id: 'operator_core', label: 'Operator Core ($2,500/mo)' },
    { id: 'operator_growth', label: 'Operator Growth ($3,500/mo)' },
    { id: 'enterprise', label: 'Enterprise (Custom)' },
];

function PlanEditor({ org, onSaved }: { org: OrgRow; onSaved: (planId: PlanId) => void }) {
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState<PlanId>((org.planId as PlanId) ?? 'free');
    const [saving, startSave] = useTransition();
    const [error, setError] = useState('');
    const [savedPlan, setSavedPlan] = useState(org.planId);

    const currentLabel = PLANS.find(p => p.id === (savedPlan ?? 'free'))?.label ?? savedPlan ?? 'none';

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
                <span className={cn(
                    'font-mono',
                    savedPlan && savedPlan !== 'free' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500',
                )}>
                    {currentLabel}
                </span>
                <Pencil className="h-3 w-3" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1 flex-wrap">
            <select
                value={selected}
                onChange={e => setSelected(e.target.value as PlanId)}
                className="text-xs border rounded px-2 py-0.5 bg-background"
            >
                {PLANS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                ))}
            </select>
            <button
                disabled={saving}
                onClick={() => startSave(async () => {
                    setError('');
                    const res = await setOrgPlan(org.id, selected);
                    if (res.success) {
                        setSavedPlan(selected);
                        onSaved(selected);
                        setEditing(false);
                    } else {
                        setError(res.error ?? 'Failed');
                    }
                })}
                className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
                {saving ? '…' : 'Set Plan'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    );
}

function OrgCard({ org }: { org: OrgRow }) {
    const [subdomain, setSubdomain] = useState(org.bakedBotSubdomain ?? '');
    const [planId, setPlanId] = useState(org.planId);
    const [expanded, setExpanded] = useState(false);
    const [result, setResult] = useState<ProvisionResult | null>(null);
    const [running, startProvision] = useTransition();

    const isProvisioned = !!org.provisioning?.completedAt;
    const orgWithSub = { ...org, bakedBotSubdomain: subdomain || org.bakedBotSubdomain, planId };

    function run() {
        startProvision(async () => {
            setExpanded(true);
            setResult(null);
            const res = await provisionOrg(org.id);
            setResult(res);
        });
    }

    return (
        <div className={cn(
            'border rounded-lg overflow-hidden transition-all',
            isProvisioned && 'border-emerald-200 dark:border-emerald-800/50',
        )}>
            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{org.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{org.type}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium capitalize', STATUS_BADGE[org.subscriptionStatus] ?? STATUS_BADGE.none)}>
                                {org.subscriptionStatus}
                            </span>
                        </div>
                        <SubdomainEditor
                            org={orgWithSub}
                            onSaved={sub => setSubdomain(sub)}
                        />
                        <PlanEditor
                            org={orgWithSub}
                            onSaved={id => setPlanId(id)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {isProvisioned && !running && !result && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Provisioned
                        </span>
                    )}
                    <button
                        onClick={run}
                        disabled={running || (!subdomain && !org.bakedBotSubdomain)}
                        className={cn(
                            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                            'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40',
                        )}
                    >
                        {running
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</>
                            : <><Zap className="h-3.5 w-3.5" /> {isProvisioned ? 'Re-provision' : 'Provision'}</>
                        }
                    </button>
                </div>
            </div>

            {/* Steps panel */}
            {(expanded || running || result) && (
                <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-1.5">
                    {running && !result && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running provisioning steps…
                        </div>
                    )}

                    {result && result.steps.map(s => (
                        <div key={s.key} className="flex items-start gap-2 text-sm">
                            <StepIcon status={s.status} />
                            <div>
                                <span className={cn(
                                    'font-medium',
                                    s.status === 'ok' && 'text-foreground',
                                    s.status === 'error' && 'text-red-600 dark:text-red-400',
                                    s.status === 'skipped' && 'text-muted-foreground',
                                )}>
                                    {s.label}
                                </span>
                                {s.detail && (
                                    <span className="text-xs text-muted-foreground ml-1.5">{s.detail}</span>
                                )}
                            </div>
                        </div>
                    ))}

                    {result && (
                        <div className={cn(
                            'mt-2 pt-2 border-t border-border text-xs font-medium',
                            result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                        )}>
                            {result.success
                                ? '✓ Provisioning complete. SES verification takes ~15 min to propagate.'
                                : `✗ ${result.error ?? 'Some steps failed — see above.'}`
                            }
                        </div>
                    )}

                    {!running && !result && (
                        <p className="text-xs text-muted-foreground">
                            Click <strong>Provision</strong> to run all setup steps for this org.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export function OrgProvisioningClient({ orgs }: Props) {
    const [search, setSearch] = useState('');

    const filtered = orgs.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.bakedBotSubdomain ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const provisioned = filtered.filter(o => !!o.provisioning?.completedAt);
    const unprovisioned = filtered.filter(o => !o.provisioning?.completedAt);

    return (
        <div className="space-y-6">
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search orgs…"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />

            {unprovisioned.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Needs Provisioning ({unprovisioned.length})
                    </h2>
                    <div className="space-y-2">
                        {unprovisioned.map(org => <OrgCard key={org.id} org={org} />)}
                    </div>
                </section>
            )}

            {provisioned.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Provisioned ({provisioned.length})
                    </h2>
                    <div className="space-y-2">
                        {provisioned.map(org => <OrgCard key={org.id} org={org} />)}
                    </div>
                </section>
            )}

            {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-12">No orgs match your search.</p>
            )}
        </div>
    );
}
