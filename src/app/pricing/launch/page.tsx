"use client";

import Link from "next/link";
import { ArrowLeft, Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";

export default function LaunchPricingDetails() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1 py-12 px-4 md:py-20 md:px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="mb-8">
                        <Link href="/pricing" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors mb-6">
                            <ArrowLeft className="h-4 w-4" /> Back to Pricing
                        </Link>

                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                            <div>
                                <Badge className="mb-3">Launch Plans — Full Details</Badge>
                                <h1 className="text-4xl font-bold tracking-tight">Buy the Core. Add agents when you need them.</h1>
                                <p className="mt-4 text-xl text-muted-foreground max-w-3xl text-balance">
                                    BakedBot is built for real operations: menus, discovery, leads, compliance, and growth.
                                    Your plan includes monthly usage, and <strong className="text-foreground">all agents share the same allowance</strong>—so you can run lots of tasks without guessing what’s “included.”
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-12 mt-16">
                        {/* What you get */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6">What you get with every Launch plan</h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-xl">The Core Platform</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            <DetailItem title="Headless Menu + SEO Pages" desc="Fast, indexable pages that drive discovery" />
                                            <DetailItem title="Smokey" desc="AI budtender experiences and on-site conversion" />
                                            <DetailItem title="Deebo" desc="Compliance pre-checks and audit trails" />
                                            <DetailItem title="Agent Workspace" desc="Run tasks, schedule automations, save playbooks" />
                                        </ul>
                                    </CardContent>
                                </Card>

                                <Card className="bg-muted/30 border-primary/20">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-primary">The Agent Workspace</CardTitle>
                                        <CardDescription>Think "operator cockpit" for your team</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            <li className="flex gap-3">
                                                <span className="bg-primary/10 text-primary rounded-full p-1 h-fit mt-0.5"><Check className="h-3 w-3" /></span>
                                                <div>
                                                    <span className="font-medium block">Run one-off tasks</span>
                                                    <span className="text-sm text-muted-foreground">“Generate a report,” “Find new retailers,” “Draft a compliant campaign”</span>
                                                </div>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="bg-primary/10 text-primary rounded-full p-1 h-fit mt-0.5"><Check className="h-3 w-3" /></span>
                                                <div>
                                                    <span className="font-medium block">Schedule recurring tasks</span>
                                                    <span className="text-sm text-muted-foreground">“Daily snapshot,” “Weekly KPI email,” “Monthly footprint audit”</span>
                                                </div>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="bg-primary/10 text-primary rounded-full p-1 h-fit mt-0.5"><Check className="h-3 w-3" /></span>
                                                <div>
                                                    <span className="font-medium block">Save workflows as Playbooks</span>
                                                    <span className="text-sm text-muted-foreground">Standardize operations so your team can reuse them</span>
                                                </div>
                                            </li>
                                        </ul>
                                        <div className="mt-6 p-3 bg-background rounded-lg border text-sm text-muted-foreground">
                                            <strong>Important:</strong> All agents run inside the Workspace and share the same usage allowance + overages.
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <Separator />

                        {/* Usage Meters */}
                        <section>
                            <div className="max-w-3xl mb-8">
                                <h2 className="text-2xl font-bold mb-2">The usage meters (simple on purpose)</h2>
                                <p className="text-muted-foreground">Your plan includes a monthly allowance. When you do more, you can upgrade or pay transparent overages.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12">
                                <div>
                                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">Core meters <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Already in your plans</span></h3>
                                    <ul className="space-y-4">
                                        <MeterItem label="Menu/Pageviews" desc="Traffic to your menu + SEO pages" />
                                        <MeterItem label="Smokey Sessions" desc="Customer conversations and recommendations" />
                                        <MeterItem label="Deebo Checks" desc="Compliance preflight scans and validations" />
                                        <MeterItem label="Contacts Stored" desc="Leads/customers saved in your workspace" />
                                        <MeterItem label="Sync Runs" desc="Menu/catalog refreshes and data pulls" />
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">Agent meters <span className="text-xs font-normal text-white bg-primary px-2 py-0.5 rounded-full">New & Universal</span></h3>
                                    <ul className="space-y-6">
                                        <li>
                                            <div className="font-medium text-lg">Intel Runs</div>
                                            <p className="text-muted-foreground text-sm mb-2">Any generated intelligence output:</p>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                <li>Daily snapshots, weekly summaries</li>
                                                <li>Alert batches, scheduled reports</li>
                                            </ul>
                                            <p className="text-xs text-muted-foreground mt-2 italic">“Think of an Intel Run as ‘one finished report.’”</p>
                                        </li>
                                        <li>
                                            <div className="font-medium text-lg">Market Sensors</div>
                                            <p className="text-muted-foreground text-sm mb-2">Monitored menus/URLs/retailers per month:</p>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                <li>Used for competitive tracking</li>
                                                <li>Price monitoring, placement detection</li>
                                            </ul>
                                            <p className="text-xs text-muted-foreground mt-2 italic">“Sensors are your watchlist. More sensors = wider coverage.”</p>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Agent Mapping */}
                        <section className="bg-muted/20 -mx-4 px-4 py-8 md:p-8 rounded-2xl md:mx-0">
                            <h2 className="text-2xl font-bold mb-8">How agents map to meters</h2>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AgentCard
                                    name="Smokey (AI Budtender)"
                                    bestFor="Conversion, product discovery, on-site guidance"
                                    uses={["Smokey Sessions", "Deebo Checks (optional)"]}
                                />
                                <AgentCard
                                    name="Craig (Marketing)"
                                    bestFor="Follow-ups, nurture sequences, lifecycle campaigns"
                                    uses={["Contacts Stored", "Deebo Checks", "Intel Runs (optional)"]}
                                />
                                <AgentCard
                                    name="Pops (Analytics)"
                                    bestFor="Reporting, KPI trends, executive summaries"
                                    uses={["Intel Runs", "Sync Runs (optional)"]}
                                />
                                <AgentCard
                                    name="Ezal (Intel)"
                                    bestFor="Competitor pricing, promos, placement changes"
                                    uses={["Market Sensors", "Intel Runs"]}
                                />
                                <AgentCard
                                    name="Deebo (Compliance)"
                                    bestFor="Compliance checks, audit logs, channel rules"
                                    uses={["Deebo Checks", "Intel Runs (optional)"]}
                                />
                            </div>
                        </section>

                        {/* Examples */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6">Common tasks and what they “cost”</h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <ExampleCard
                                    title="“Daily MFNY Snapshot”"
                                    items={[
                                        "1 Intel Run per day",
                                        "Market Sensors for the watchlist",
                                        "Optional email delivery"
                                    ]}
                                />
                                <ExampleCard
                                    title="“Generate 25 SEO pages/day”"
                                    items={[
                                        "Sync Runs (if pulling fresh menu data)",
                                        "Deebo Checks (compliance preflight per page)",
                                        "Pageviews depend on traffic (metered separately)"
                                    ]}
                                />
                                <ExampleCard
                                    title="“Compliant email sequence”"
                                    items={[
                                        "Contacts Stored",
                                        "Deebo Checks (each message variant)",
                                        "Optional Intel Run (if generated from insights)"
                                    ]}
                                />
                                <ExampleCard
                                    title="“Weekly competitor price index”"
                                    items={[
                                        "Market Sensors (competitor menus monitored)",
                                        "1 Intel Run per week (the report)"
                                    ]}
                                />
                            </div>
                        </section>

                        <Separator />

                        {/* Plan Breakdown */}
                        <section>
                            <h2 className="text-2xl font-bold mb-8">Plan-by-plan breakdown</h2>
                            <div className="space-y-8">
                                <PlanSection
                                    name="Starter (Launch)"
                                    fit="Best for: single location, early traction, foundational automation"
                                    includes={[
                                        "Headless Menu + SEO pages",
                                        "Smokey sessions included",
                                        "Deebo checks included",
                                        "Agent Workspace: core tasks + basic automations",
                                        "Intel Starter: weekly snapshot + up to 10 Market Sensors"
                                    ]}
                                    goodFor={["Claiming pages and getting discovered", "Weekly “what changed” intelligence", "Basic compliance + basic reporting"]}
                                />
                                <PlanSection
                                    name="Growth (Launch)"
                                    fit="Best for: multi-location or aggressive growth, recurring workflows"
                                    includes={[
                                        "Everything in Starter",
                                        "Higher allowances across core meters",
                                        "Agent Workspace: team workflows + automation starter",
                                        "Intel Growth: daily snapshot + alerts + up to 50 Market Sensors"
                                    ]}
                                    goodFor={["Daily intelligence on your brand or footprint", "Automated lead follow-up (Craig)", "Weekly performance reporting (Pops)"]}
                                />
                                <PlanSection
                                    name="Scale (Launch)"
                                    fit="Best for: competitive markets, more automation, more monitoring"
                                    includes={[
                                        "Everything in Growth",
                                        "Higher allowances and priority processing",
                                        "Agent Workspace: advanced workflows + priority processing",
                                        "Intel Scale: daily snapshot + competitor set + up to 200 Market Sensors"
                                    ]}
                                    goodFor={["Always-on competitive tracking (Ezal)", "Multi-market expansion", "More alerts + deeper reporting"]}
                                />
                                <PlanSection
                                    name="Enterprise (Launch)"
                                    borderColor="border-primary"
                                    fit="Best for: national coverage, integrations, SLAs"
                                    includes={[
                                        "Everything in Scale",
                                        "Unlimited Intel Runs + custom Market Sensor coverage",
                                        "Custom integrations and workflows",
                                        "SLAs and dedicated support"
                                    ]}
                                    goodFor={["Large MSOs, big brand networks", "Custom reporting + automated workflows", "Custom monitoring footprints"]}
                                />
                            </div>
                        </section>

                        {/* Integrations */}
                        <section className="bg-card border rounded-xl p-8">
                            <h2 className="text-2xl font-bold mb-6">Integrations (what’s required vs optional)</h2>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">Gmail <span className="text-muted-foreground font-normal text-sm ml-2">(Optional, enables delivery)</span></h3>
                                    <p className="text-muted-foreground text-sm">If you want snapshots and reports emailed automatically, connect Gmail. We request permission to send only the reports you configure. Inbox reading is not required.</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">Google Sheets <span className="text-muted-foreground font-normal text-sm ml-2">(Optional, best for ops)</span></h3>
                                    <p className="text-muted-foreground text-sm">Sheets is the simplest “ops-friendly” place to log daily snapshot metrics, keep target lists, and track outreach outcomes.</p>
                                </div>
                            </div>
                        </section>

                        {/* FAQ */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6">FAQ</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <h4 className="font-semibold mb-2">Do I need to understand all the meters?</h4>
                                    <p className="text-sm text-muted-foreground">No. Most customers just enable playbooks (daily snapshot, weekly report, lead follow-up) and the dashboard shows usage automatically.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Can I run tasks without integrations?</h4>
                                    <p className="text-sm text-muted-foreground">Yes. Snapshots and reports still run in-app. Integrations are only needed for delivery (email) or exporting (Sheets).</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Will you block me mid-month?</h4>
                                    <p className="text-sm text-muted-foreground">No surprise blocks. You’ll get usage warnings and clear options to upgrade or add coverage.</p>
                                </div>
                            </div>
                        </section>

                        {/* CTA */}
                        <section className="text-center py-10 bg-muted/40 rounded-2xl border border-dashed border-border px-4">
                            <h2 className="text-2xl font-bold mb-4">Start simple. Scale when it works.</h2>
                            <p className="text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
                                Start with the Core (menu + discovery + compliance). Add agents when you want automation, intel, and growth loops.
                            </p>
                            <div className="flex justify-center gap-3">
                                <Button size="lg" asChild href="/get-started">
                                    <Link href="/get-started">Start Launch Plan</Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild href="/pricing">
                                    <Link href="/pricing">Compare Plans</Link>
                                </Button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}

function DetailItem({ title, desc }: { title: string, desc: string }) {
    return (
        <li className="flex gap-3">
            <span className="bg-secondary p-1 rounded-full h-fit mt-0.5 text-foreground"><Check className="h-3 w-3" /></span>
            <div>
                <span className="font-medium block">{title}</span>
                <span className="text-sm text-muted-foreground">{desc}</span>
            </div>
        </li>
    );
}

function MeterItem({ label, desc }: { label: string, desc: string }) {
    return (
        <li className="border-l-2 border-muted pl-4">
            <div className="font-medium text-foreground">{label}</div>
            <div className="text-sm text-muted-foreground">{desc}</div>
        </li>
    );
}

function AgentCard({ name, bestFor, uses }: { name: string, bestFor: string, uses: string[] }) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground mb-4 h-10">{bestFor}</div>
                <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Uses:</span>
                    <ul className="text-sm space-y-1">
                        {uses.map((u, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                                <span className="text-primary mt-1">•</span> {u}
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}

function ExampleCard({ title, items }: { title: string, items: string[] }) {
    return (
        <div className="border rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-3">{title}</h3>
            <ul className="space-y-2">
                {items.map((it, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{it}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PlanSection({ name, fit, includes, goodFor, borderColor }: { name: string, fit: string, includes: string[], goodFor: string[], borderColor?: string }) {
    return (
        <div className={`border rounded-xl overflow-hidden ${borderColor ? borderColor : ''}`}>
            <div className="bg-muted/30 p-6 border-b">
                <h3 className="text-2xl font-bold mb-2">{name}</h3>
                <p className="text-muted-foreground">{fit}</p>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-8">
                <div>
                    <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Includes</h4>
                    <ul className="space-y-2">
                        {includes.map((inc, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span>{inc}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Good For</h4>
                    <ul className="space-y-2">
                        {goodFor.map((gf, i) => (
                            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                                <span className="text-primary mt-1">•</span>
                                <span>{gf}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
