'use client';

import React, { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Download, RotateCcw } from "lucide-react";

/**
 * FFF Audit Lead Magnet (Compact Preview)
 *
 * FFF Score (0–100) = Findability (0–35) + Fit (0–35) + Fidelity (0–30)
 *
 * Lead-magnet gating:
 * - Score preview is free
 * - Top 3 leaks + ROI math + 90-day plan require unlock
 * - Unlock requires email + consent to receive the report
 */

type BusinessType = "dispensary" | "brand";

type FormState = {
    businessType: BusinessType;
    state: string;
    websiteUrl: string;

    // Findability
    menuType: "iframe" | "embedded" | "headless" | "not_sure";
    speed: "fast" | "average" | "slow" | "not_sure";
    organicShare: "lt10" | "10to30" | "30plus" | "not_sure";
    indexation: "poor" | "ok" | "good" | "not_sure";

    // Fit
    confusion: "high" | "medium" | "low";
    personalization: "none" | "basic" | "advanced" | "not_sure";

    // Fidelity
    ageGate: "none" | "basic" | "strong" | "not_sure";
    smsConsent: "none" | "some" | "strong" | "not_sure";
    auditTrail: "none" | "partial" | "strong" | "not_sure";
    complianceWorkflow: "ad_hoc" | "checklist" | "policy_engine";

    // ROI inputs (optional)
    sessionsMonthly: string;
    onlineOrdersMonthly: string;
    aov: string;
    grossMarginPct: string;
    manualHoursPerWeek: string;
    loadedHourlyCost: string;

    // Gate
    email: string;
    reportConsent: boolean;
    marketingConsent: boolean;
};

const US_STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "DC",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
];

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function safeNum(value: string, fallback = 0) {
    const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : fallback;
}

function fmtCurrency(n: number) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }).format(n);
    } catch {
        return `$${Math.round(n).toLocaleString()}`;
    }
}

type Leak = { title: string; why: string; fix: string; bucket: string };

type Scores = {
    findability: number;
    fit: number;
    fidelity: number;
    total: number;
    leaks: Leak[];
    roi: {
        laborSavingsAnnual: number;
        grossProfitUpsideAnnual: number;
        totalImpactAnnual: number;
    };
    plan: { phase: string; weeks: string; bullets: string[] }[];
};

function computeScores(s: FormState): Scores {
    // Findability (0–35)
    let f = 0;
    f += s.menuType === "headless" ? 16 : s.menuType === "embedded" ? 10 : s.menuType === "iframe" ? 3 : 6;
    f += s.speed === "fast" ? 8 : s.speed === "average" ? 5 : s.speed === "slow" ? 2 : 4;
    f += s.organicShare === "30plus" ? 6 : s.organicShare === "10to30" ? 4 : s.organicShare === "lt10" ? 1 : 2;
    f += s.indexation === "good" ? 5 : s.indexation === "ok" ? 3 : s.indexation === "poor" ? 1 : 2;
    f = clamp(f, 0, 35);

    // Fit (0–35)
    let fit = 0;
    fit += s.personalization === "advanced" ? 16 : s.personalization === "basic" ? 10 : s.personalization === "none" ? 3 : 7;
    fit += s.confusion === "low" ? 19 : s.confusion === "medium" ? 13 : 6;
    fit = clamp(fit, 0, 35);

    // Fidelity (0–30)
    let fid = 0;
    fid += s.ageGate === "strong" ? 10 : s.ageGate === "basic" ? 6 : s.ageGate === "none" ? 1 : 4;
    fid += s.smsConsent === "strong" ? 7 : s.smsConsent === "some" ? 4 : s.smsConsent === "none" ? 1 : 3;
    fid += s.auditTrail === "strong" ? 8 : s.auditTrail === "partial" ? 5 : s.auditTrail === "none" ? 1 : 3;
    fid += s.complianceWorkflow === "policy_engine" ? 5 : s.complianceWorkflow === "checklist" ? 3 : 1;
    fid = clamp(fid, 0, 30);

    const total = clamp(f + fit + fid, 0, 100);

    // Leaks (Top 3)
    const leaks: Leak[] = [];
    if (s.menuType === "iframe") {
        leaks.push({
            title: "Invisible menu (iframe drag)",
            bucket: "outdated menus",
            why: "Iframe menus often limit indexability and slow down the buying journey.",
            fix: "Move to an indexable headless menu on your domain + schema + performance budgets.",
        });
    }
    if (s.confusion === "high") {
        leaks.push({
            title: "Customer confusion at the moment of choice",
            bucket: "confusion",
            why: "When effects/intent aren’t clarified, customers browse longer and buy less.",
            fix: "Add guided discovery + effect-aware recommendations (web/chat/SMS).",
        });
    }
    if (s.smsConsent === "none" || s.auditTrail === "none" || s.complianceWorkflow === "ad_hoc") {
        leaks.push({
            title: "Compliance proof gap",
            bucket: "compliance risk",
            why: "In cannabis, marketing without provable consent + logs becomes license risk.",
            fix: "Implement consent capture + STOP/HELP hygiene + policy checks + audit trails.",
        });
    }
    // Fill remaining leaks based on weakest pillar
    const weakness = [
        { k: "Findability", v: f / 35 },
        { k: "Fit", v: fit / 35 },
        { k: "Fidelity", v: fid / 30 },
    ].sort((a, b) => a.v - b.v)[0]?.k;

    if (leaks.length < 3 && weakness === "Findability") {
        leaks.push({
            title: "Low discoverability",
            bucket: "marketing inefficiency",
            why: "Your discoverability signals suggest organic demand leakage.",
            fix: "Ship indexable pages + speed improvements + internal linking.",
        });
    }
    if (leaks.length < 3 && weakness === "Fit") {
        leaks.push({
            title: "Weak personalization",
            bucket: "confusion",
            why: "Lack of personalization reduces conversion and repeat purchase.",
            fix: "Start with basic segments → move to effect-aware policies.",
        });
    }
    if (leaks.length < 3 && weakness === "Fidelity") {
        leaks.push({
            title: "Process risk",
            bucket: "compliance risk",
            why: "Without a consistent check+log flow, compliance becomes a guess.",
            fix: "Add a preflight compliance gate for all customer-facing content.",
        });
    }

    const topLeaks = leaks.slice(0, 3);

    // ROI (simple, conservative)
    const manualHoursPerWeek = safeNum(s.manualHoursPerWeek, 0);
    const loadedHourlyCost = safeNum(s.loadedHourlyCost, 0);
    const laborSavingsAnnual = manualHoursPerWeek * loadedHourlyCost * 52;

    const sessionsMonthly = safeNum(s.sessionsMonthly, 0);
    const ordersMonthly = safeNum(s.onlineOrdersMonthly, 0);
    const aov = safeNum(s.aov, 0);
    const gm = clamp(safeNum(s.grossMarginPct, 0) / 100, 0, 1);

    // Directional upside: small lifts tied to score
    const baseConv = sessionsMonthly > 0 ? ordersMonthly / sessionsMonthly : 0;
    const convLift = total >= 80 ? 0.04 : total >= 60 ? 0.025 : 0.015; // 1.5–4%
    const organicLift = total >= 80 ? 0.12 : total >= 60 ? 0.08 : 0.04; // 4–12%

    const newSessions = sessionsMonthly * (1 + organicLift);
    const newOrders = newSessions * baseConv * (1 + convLift);
    const incrementalOrdersMonthly = Math.max(0, newOrders - ordersMonthly);
    const grossProfitUpsideAnnual = incrementalOrdersMonthly * aov * gm * 12;

    const totalImpactAnnual = laborSavingsAnnual + grossProfitUpsideAnnual;

    const plan = [
        {
            phase: "Phase 0 — Readiness",
            weeks: "Week 0–1",
            bullets: [
                "Baseline KPIs + consent audit",
                "Menu/indexation check + speed snapshot",
                "Pick 1 measurable outcome",
            ],
        },
        {
            phase: "Phase 1 — Deploy + Measure",
            weeks: "Weeks 2–5",
            bullets: [
                "Fix menu architecture + indexability",
                "Add guided discovery (Smokey)",
                "Automate 1 lifecycle (Craig) with preflight checks",
            ],
        },
        {
            phase: "Phase 2 — Optimize",
            weeks: "Weeks 6–9",
            bullets: [
                "A/B test conversion flow",
                "Add competitive/assortment signals (Ezal)",
                "Operational dashboards (Pops)",
            ],
        },
        {
            phase: "Phase 3 — Scale",
            weeks: "Weeks 10–12",
            bullets: [
                "Expand segments + loyalty (Mrs. Parker)",
                "Governance + audit trails",
                "Quarterly compliance refresh (Deebo)",
            ],
        },
    ];

    return {
        findability: f,
        fit,
        fidelity: fid,
        total,
        leaks: topLeaks,
        roi: { laborSavingsAnnual, grossProfitUpsideAnnual, totalImpactAnnual },
        plan,
    };
}

function downloadJson(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Tiny self-checks (kept small on purpose)
if (typeof window !== 'undefined') {
    (function devSmokeTests() {
        try {
            const s = computeScores({
                businessType: "dispensary",
                state: "IL",
                websiteUrl: "x",
                menuType: "headless",
                speed: "fast",
                organicShare: "30plus",
                indexation: "good",
                confusion: "low",
                personalization: "advanced",
                ageGate: "strong",
                smsConsent: "strong",
                auditTrail: "strong",
                complianceWorkflow: "policy_engine",
                sessionsMonthly: "1000",
                onlineOrdersMonthly: "50",
                aov: "50",
                grossMarginPct: "50",
                manualHoursPerWeek: "5",
                loadedHourlyCost: "30",
                email: "",
                reportConsent: false,
                marketingConsent: false,
            });
            console.assert(s.total >= 0 && s.total <= 100, "FFF score should be 0..100");
            console.assert(s.findability <= 35 && s.fit <= 35 && s.fidelity <= 30, "Pillar maxes");
        } catch {
            // ignore
        }
    })();
}

export default function FFFAuditLeadMagnetCompact() {
    const [unlocked, setUnlocked] = useState(false);

    const [state, setState] = useState<FormState>({
        businessType: "dispensary",
        state: "IL",
        websiteUrl: "",

        menuType: "not_sure",
        speed: "not_sure",
        organicShare: "not_sure",
        indexation: "not_sure",

        confusion: "medium",
        personalization: "not_sure",

        ageGate: "not_sure",
        smsConsent: "not_sure",
        auditTrail: "not_sure",
        complianceWorkflow: "checklist",

        sessionsMonthly: "",
        onlineOrdersMonthly: "",
        aov: "",
        grossMarginPct: "",
        manualHoursPerWeek: "",
        loadedHourlyCost: "",

        email: "",
        reportConsent: false,
        marketingConsent: false,
    });

    const scores = useMemo(() => computeScores(state), [state]);

    const scoreLabel = scores.total >= 80 ? "Strong" : scores.total >= 60 ? "Decent" : "Leaky";

    function reset() {
        setUnlocked(false);
        setState((p) => ({
            ...p,
            websiteUrl: "",
            sessionsMonthly: "",
            onlineOrdersMonthly: "",
            aov: "",
            grossMarginPct: "",
            manualHoursPerWeek: "",
            loadedHourlyCost: "",
            email: "",
            reportConsent: false,
            marketingConsent: false,
        }));
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-full">Free Tool</Badge>
                            <Badge variant="outline" className="rounded-full">FFF Audit</Badge>
                            <Badge variant={unlocked ? "outline" : "secondary"} className="rounded-full">
                                {unlocked ? "Unlocked" : "Preview"}
                            </Badge>
                        </div>
                        <div className="text-3xl font-bold tracking-tight">Cannabis Growth Leak Audit</div>
                        <div className="text-sm text-muted-foreground max-w-2xl">
                            One score. Three pillars. Clear next steps. (Findability + Fit + Fidelity)
                        </div>
                    </div>

                    <Button variant="outline" className="rounded-2xl" onClick={reset}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* LEFT: INPUTS */}
                    <Card className="rounded-2xl lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">Quick audit inputs</CardTitle>
                            <CardDescription>Fast diagnosis. No tech rabbit holes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Business type</Label>
                                    <Select
                                        value={state.businessType}
                                        onValueChange={(v) => setState((p) => ({ ...p, businessType: v as BusinessType }))}
                                    >
                                        <SelectTrigger className="rounded-2xl">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dispensary">Dispensary</SelectItem>
                                            <SelectItem value="brand">Brand</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <Select value={state.state} onValueChange={(v) => setState((p) => ({ ...p, state: v }))}>
                                        <SelectTrigger className="rounded-2xl">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {US_STATES.map((st) => (
                                                <SelectItem key={st} value={st}>{st}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Website</Label>
                                    <Input
                                        className="rounded-2xl"
                                        placeholder="https://..."
                                        value={state.websiteUrl}
                                        onChange={(e) => setState((p) => ({ ...p, websiteUrl: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Menu type</Label>
                                    <Select value={state.menuType} onValueChange={(v) => setState((p) => ({ ...p, menuType: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="headless">Headless (on your domain)</SelectItem>
                                            <SelectItem value="embedded">Embedded (not iframe)</SelectItem>
                                            <SelectItem value="iframe">Iframe</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Speed</Label>
                                    <Select value={state.speed} onValueChange={(v) => setState((p) => ({ ...p, speed: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fast">Fast</SelectItem>
                                            <SelectItem value="average">Average</SelectItem>
                                            <SelectItem value="slow">Slow</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Organic traffic share</Label>
                                    <Select value={state.organicShare} onValueChange={(v) => setState((p) => ({ ...p, organicShare: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lt10">&lt; 10%</SelectItem>
                                            <SelectItem value="10to30">10–30%</SelectItem>
                                            <SelectItem value="30plus">30%+</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Indexation</Label>
                                    <Select value={state.indexation} onValueChange={(v) => setState((p) => ({ ...p, indexation: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="good">Good</SelectItem>
                                            <SelectItem value="ok">Okay</SelectItem>
                                            <SelectItem value="poor">Poor</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Customer confusion</Label>
                                    <Select value={state.confusion} onValueChange={(v) => setState((p) => ({ ...p, confusion: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Personalization</Label>
                                    <Select value={state.personalization} onValueChange={(v) => setState((p) => ({ ...p, personalization: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="basic">Basic</SelectItem>
                                            <SelectItem value="advanced">Advanced</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Age gate</Label>
                                    <Select value={state.ageGate} onValueChange={(v) => setState((p) => ({ ...p, ageGate: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="basic">Basic</SelectItem>
                                            <SelectItem value="strong">Strong</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>SMS consent</Label>
                                    <Select value={state.smsConsent} onValueChange={(v) => setState((p) => ({ ...p, smsConsent: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="some">Some</SelectItem>
                                            <SelectItem value="strong">Strong</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Audit trail</Label>
                                    <Select value={state.auditTrail} onValueChange={(v) => setState((p) => ({ ...p, auditTrail: v as any }))}>
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="partial">Partial</SelectItem>
                                            <SelectItem value="strong">Strong</SelectItem>
                                            <SelectItem value="not_sure">Not sure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Compliance workflow</Label>
                                    <Select
                                        value={state.complianceWorkflow}
                                        onValueChange={(v) => setState((p) => ({ ...p, complianceWorkflow: v as any }))}
                                    >
                                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ad_hoc">Ad hoc</SelectItem>
                                            <SelectItem value="checklist">Checklist</SelectItem>
                                            <SelectItem value="policy_engine">Policy engine</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Monthly sessions (optional)</Label>
                                    <Input className="rounded-2xl" value={state.sessionsMonthly} onChange={(e) => setState((p) => ({ ...p, sessionsMonthly: e.target.value }))} placeholder="e.g., 12000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Monthly online orders (optional)</Label>
                                    <Input className="rounded-2xl" value={state.onlineOrdersMonthly} onChange={(e) => setState((p) => ({ ...p, onlineOrdersMonthly: e.target.value }))} placeholder="e.g., 900" />
                                </div>
                                <div className="space-y-2">
                                    <Label>AOV (optional)</Label>
                                    <Input className="rounded-2xl" value={state.aov} onChange={(e) => setState((p) => ({ ...p, aov: e.target.value }))} placeholder="e.g., 65" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gross margin % (optional)</Label>
                                    <Input className="rounded-2xl" value={state.grossMarginPct} onChange={(e) => setState((p) => ({ ...p, grossMarginPct: e.target.value }))} placeholder="e.g., 45" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Manual hours/week (optional)</Label>
                                    <Input className="rounded-2xl" value={state.manualHoursPerWeek} onChange={(e) => setState((p) => ({ ...p, manualHoursPerWeek: e.target.value }))} placeholder="e.g., 6" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Loaded hourly cost (optional)</Label>
                                    <Input className="rounded-2xl" value={state.loadedHourlyCost} onChange={(e) => setState((p) => ({ ...p, loadedHourlyCost: e.target.value }))} placeholder="e.g., 35" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* RIGHT: RESULTS + GATE */}
                    <div className="space-y-4">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-base">FFF Score</CardTitle>
                                <CardDescription>0–100 (preview is free)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="text-4xl font-bold">{scores.total}</div>
                                        <div className="text-sm text-muted-foreground">Status: {scoreLabel}</div>
                                    </div>
                                    <Button
                                        className="rounded-2xl"
                                        variant="outline"
                                        disabled={!unlocked}
                                        onClick={() => downloadJson("fff-audit.json", { state, scores, exportedAt: new Date().toISOString() })}
                                    >
                                        <Download className="w-4 h-4 mr-2" /> JSON
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Findability</span>
                                        <span className="text-muted-foreground">{scores.findability}/35</span>
                                    </div>
                                    <Progress value={Math.round((scores.findability / 35) * 100)} />
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span>Fit</span>
                                        <span className="text-muted-foreground">{scores.fit}/35</span>
                                    </div>
                                    <Progress value={Math.round((scores.fit / 35) * 100)} />
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span>Fidelity</span>
                                        <span className="text-muted-foreground">{scores.fidelity}/30</span>
                                    </div>
                                    <Progress value={Math.round((scores.fidelity / 30) * 100)} />
                                </div>
                            </CardContent>
                        </Card>

                        {!unlocked ? (
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-base">Unlock the full report</CardTitle>
                                    <CardDescription>Leaks + ROI + 90-day plan</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input className="rounded-2xl" value={state.email} onChange={(e) => setState((p) => ({ ...p, email: e.target.value }))} placeholder="you@company.com" />
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox checked={state.reportConsent} onCheckedChange={(v) => setState((p) => ({ ...p, reportConsent: Boolean(v) }))} />
                                        <div className="text-sm text-muted-foreground">Email me my report (required).</div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox checked={state.marketingConsent} onCheckedChange={(v) => setState((p) => ({ ...p, marketingConsent: Boolean(v) }))} />
                                        <div className="text-sm text-muted-foreground">You can send follow-ups (optional).</div>
                                    </div>

                                    <Button
                                        className="rounded-2xl w-full"
                                        disabled={!state.email || !state.reportConsent}
                                        onClick={() => {
                                            // Hook: Save lead to Firestore/CRM
                                            // Hook: Trigger Craig nurture
                                            // Hook: Generate PDF + email
                                            setUnlocked(true);
                                        }}
                                    >
                                        <ArrowRight className="w-4 h-4 mr-2" /> Unlock
                                    </Button>

                                    <div className="text-xs text-muted-foreground">
                                        We’ll use your email to send the report you requested.
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-base">Top 3 growth leaks</CardTitle>
                                    <CardDescription>What’s bleeding money first</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {scores.leaks.map((l) => (
                                        <div key={l.title} className="rounded-2xl border p-3 space-y-1">
                                            <div className="font-semibold">{l.title}</div>
                                            <div className="text-sm text-muted-foreground">{l.why}</div>
                                            <div className="text-sm">Fix: {l.fix}</div>
                                            <div className="text-xs text-muted-foreground">Bucket: {l.bucket}</div>
                                        </div>
                                    ))}

                                    <Separator />

                                    <div className="rounded-2xl border p-3 space-y-2">
                                        <div className="font-semibold">ROI snapshot (conservative)</div>
                                        <div className="text-sm text-muted-foreground">
                                            Labor savings/yr: <span className="font-medium">{fmtCurrency(scores.roi.laborSavingsAnnual)}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Gross profit upside/yr: <span className="font-medium">{fmtCurrency(scores.roi.grossProfitUpsideAnnual)}</span>
                                        </div>
                                        <div className="text-sm">
                                            Total impact/yr: <span className="font-semibold">{fmtCurrency(scores.roi.totalImpactAnnual)}</span>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <div className="font-semibold">90-day plan</div>
                                        {scores.plan.map((p) => (
                                            <div key={p.phase} className="rounded-2xl border p-3">
                                                <div className="font-semibold">{p.phase}</div>
                                                <div className="text-xs text-muted-foreground">{p.weeks}</div>
                                                <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                                                    {p.bullets.map((b, i) => (
                                                        <li key={i}>{b}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
