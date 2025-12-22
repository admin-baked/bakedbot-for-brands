'use client';

import React, { useMemo, useState } from "react";

import { LiveStats } from "@/components/landing/live-stats";

/**
 * NOTE
 * This file is intentionally framework-agnostic (no next/link, no @/ alias imports)
 * so it can run in plain React/Vite/CRA and in Next.js.
 *
 * If you ARE in Next.js and want client-side navigation, you can swap <A/> back
 * to next/link later.
 */

// -----------------------------
// Tiny UI primitives (Tailwind)
// -----------------------------

type Children = { children?: React.ReactNode };

type AProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;
function A({ className = "", ...props }: AProps) {
  return (
    <a
      className={`inline-flex items-center ${className}`}
      {...props}
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "lg";
  asChild?: boolean;
  href?: string;
};
function Button({
  variant = "default",
  size = "default",
  asChild,
  href,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<string, string> = {
    default: "bg-foreground text-background hover:opacity-90",
    outline:
      "border border-border bg-background hover:bg-muted/60 text-foreground",
    ghost: "bg-transparent hover:bg-muted/60 text-foreground",
  };
  const sizes: Record<string, string> = {
    default: "h-10 px-4 py-2",
    lg: "h-11 px-5 py-2.5 text-base",
  };

  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (asChild && href) {
    return (
      <A href={href} className={cls}>
        {children}
      </A>
    );
  }

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

function Badge({ children, className = "" }: Children & { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground ${className}`}
    >
      {children}
    </span>
  );
}

function Separator({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-border ${className}`} />;
}

function Card({ children, className = "" }: Children & { className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-background shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: Children & { className?: string }) {
  return <div className={`p-6 pb-3 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }: Children & { className?: string }) {
  return <div className={`text-xl font-semibold tracking-tight ${className}`}>{children}</div>;
}

function CardDescription({
  children,
  className = "",
}: Children & { className?: string }) {
  return <div className={`text-sm text-muted-foreground ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }: Children & { className?: string }) {
  return <div className={`p-6 pt-3 ${className}`}>{children}</div>;
}

function CardFooter({ children, className = "" }: Children & { className?: string }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

function Icon({ label }: { label: string }) {
  // Minimal placeholder “icon”: avoids dependency issues (lucide, etc.).
  return (
    <div
      aria-hidden
      className="h-10 w-10 rounded-2xl border border-border bg-muted flex items-center justify-center"
      title={label}
    >
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

// -----------------------------
// Data + helpers
// -----------------------------

const nav = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Proof", href: "#proof" },
  { label: "Compliance", href: "#compliance" },
];

const outcomes = [
  {
    iconLabel: "SEO",
    title: "Get found on Google",
    desc: "Headless, SEO-first menus and product pages—built to rank and load fast.",
  },
  {
    iconLabel: "AI",
    title: "Convert confused shoppers",
    desc: "Smokey recommends the right products and routes customers to checkout-ready carts.",
  },
  {
    iconLabel: "OK",
    title: "Grow without compliance chaos",
    desc: "Deebo pre-checks marketing and on-site content with jurisdiction-aware guardrails.",
  },
];

const modules = [
  {
    iconLabel: "Core",
    name: "Core: Headless Menu + Smokey",
    blurb:
      "Your menu becomes a revenue channel: searchable pages, real-time inventory sync, and an AI budtender that drives higher-intent carts.",
    bullets: [
      "SEO-first headless menu + product pages",
      "Smokey AI budtender (site chat)",
      "Inventory & pricing sync (configurable frequency)",
      "Basic analytics + event tracking",
    ],
  },
  {
    iconLabel: "SMS",
    name: "Add-on: Craig (Marketing Automation)",
    blurb:
      "Lifecycle email + SMS workflows that stay warm, not spammy—checked before sending.",
    bullets: [
      "Welcome + winback + promo workflows",
      "Segmentation & campaign playbooks",
      "Send-time and deliverability guardrails",
      "Deebo pre-flight compliance checks",
    ],
  },
  {
    iconLabel: "BI",
    name: "Add-on: Pops (Analytics + Forecasting)",
    blurb:
      "Turn data into decisions: dashboards, insights, and forecasting you can act on.",
    bullets: [
      "Performance dashboards",
      "Cohorts & retention insights",
      "Inventory + demand forecasting",
      "Exportable reports",
    ],
  },
  {
    iconLabel: "CI",
    name: "Add-on: Ezal (Competitive Intelligence)",
    blurb:
      "Track competitor pricing and availability—then respond with smarter positioning.",
    bullets: [
      "Competitor menu tracking",
      "Price movement alerts",
      "Category and SKU comparisons",
      "Weekly competitive summary",
    ],
  },
  {
    iconLabel: "Law",
    name: "Add-on: Deebo Pro (Compliance OS)",
    blurb:
      "Policy packs, audit trails, and compliance checks across channels and jurisdictions.",
    bullets: [
      "Jurisdiction-aware rule packs",
      "Audit trail + export",
      "Content checks for web + email + SMS",
      "Admin controls for approvals",
    ],
  },
];

const proof = [
  {
    name: "Ultra Cannabis (Detroit)",
    result: "3X visibility, 50+ orders in 90 days, 85% automation",
  },
  {
    name: "Zaza Factory",
    result: "60% email open boost, 30% repeat purchase increase, 25% cost reduction",
  },
  {
    name: "40 Tons Brand",
    result: "Strategic partnership + social equity network expansion",
  },
];

type Tier = {
  name: string;
  badge: string;
  priceLaunch: number | null;
  priceLater: number | null;
  highlight: string;
  includes: string[];
};

const pricingTiers: Tier[] = [
  {
    name: "Starter",
    badge: "Launch",
    priceLaunch: 99,
    priceLater: 149,
    highlight: "Best for getting live fast",
    includes: [
      "1 location (or 1 brand site)",
      "2,000 menu/product pageviews / mo",
      "300 Smokey chat sessions / mo",
      "5,000 Deebo checks / mo",
      "1,000 contacts stored",
      "2 menu sync runs / day",
      "Email support",
    ],
  },
  {
    name: "Growth",
    badge: "Most Popular",
    priceLaunch: 249,
    priceLater: 349,
    highlight: "For consistent traffic + conversion",
    includes: [
      "Up to 3 locations (or 3 brand sites)",
      "10,000 menu/product pageviews / mo",
      "1,500 Smokey chat sessions / mo",
      "25,000 Deebo checks / mo",
      "5,000 contacts stored",
      "6 menu sync runs / day",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    badge: "Teams",
    priceLaunch: 699,
    priceLater: 899,
    highlight: "For multi-location operators",
    includes: [
      "Up to 10 locations (or 10 brand sites)",
      "50,000 menu/product pageviews / mo",
      "7,500 Smokey chat sessions / mo",
      "100,000 Deebo checks / mo",
      "25,000 contacts stored",
      "Hourly menu sync",
      "SLA + onboarding",
    ],
  },
  {
    name: "Enterprise",
    badge: "Custom",
    priceLaunch: null,
    priceLater: null,
    highlight: "Custom integrations + unlimited scale",
    includes: [
      "Unlimited locations/sites",
      "Custom usage + dedicated infrastructure",
      "Advanced compliance packs",
      "Custom workflows + integrations",
      "Dedicated success + support",
    ],
  },
];

const addOnPricing = [
  { name: "Craig (Marketing Automation)", price: 149, note: "Email workflows + segmentation" },
  { name: "Deebo Pro (Compliance OS)", price: 199, note: "Policy packs + audits" },
  { name: "Pops (Analytics + Forecasting)", price: 179, note: "Dashboards + insights" },
  { name: "Ezal (Competitive Intelligence)", price: 249, note: "Menu + pricing tracking" },
];

const overages = [
  { k: "Smokey chat sessions", v: "$25 per 1,000" },
  { k: "Menu/product pageviews", v: "$10 per 10,000" },
  { k: "Deebo compliance checks", v: "$10 per 25,000" },
  { k: "Contacts stored", v: "$15 per 5,000" },
];

export function formatMoney(value: number) {
  // Ensure stable formatting in UI and tests
  if (!Number.isFinite(value)) return "";
  return `$${Math.round(value)}`;
}

function Price({ value }: { value: number | null }) {
  if (value === null) return <span className="text-4xl font-semibold">Custom</span>;
  return (
    <div className="flex items-end gap-2">
      <span className="text-4xl font-semibold">{formatMoney(value)}</span>
      <span className="text-sm text-muted-foreground pb-1">/mo</span>
    </div>
  );
}

function Tabs({
  tabs,
  initial,
}: {
  tabs: { key: string; label: string; content: React.ReactNode }[];
  initial: string;
}) {
  const [active, setActive] = useState(initial);
  const activeTab = useMemo(() => tabs.find((t) => t.key === active) ?? tabs[0], [tabs, active]);

  return (
    <div>
      <div className="inline-flex items-center rounded-2xl border border-border bg-background p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              "px-3 py-1.5 text-sm rounded-xl transition " +
              (t.key === active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60")
            }
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{activeTab?.content}</div>
    </div>
  );
}

// -----------------------------
// Component
// -----------------------------

import Logo from "@/components/logo";

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo height={40} />
            <span className="font-semibold sr-only">BakedBot AI</span> {/* Hide text visually since logo has it, keep for screen readers if logo is image only */}
            <Badge className="ml-2">Launch</Badge>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {nav.map((n) => (
              <A key={n.href} href={n.href} className="hover:text-foreground transition">
                {n.label}
              </A>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild href="/login" className="hidden sm:inline-flex">
              Login
            </Button>
            <Button asChild href="/get-started">
              Get Started <span className="ml-2">→</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-40 left-10 h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute top-40 right-10 h-[360px] w-[360px] rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-16 pb-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4">Autonomous Cannabis Commerce OS</Badge>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Get found on Google. Convert shoppers. Stay compliant.
              <span className="block text-2xl md:text-3xl mt-2 text-muted-foreground font-normal">(For Brands & Dispensaries)</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              BakedBot AI combines an SEO-first headless menu + Smokey AI budtender, with optional marketing, analytics,
              competitive intel, and compliance guardrails. Start simple. Add power when you’re ready.
            </p>

            <LiveStats />

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild href="/free-audit">
                Run a Free Menu + SEO Audit <span className="ml-2">→</span>
              </Button>
              <Button size="lg" variant="outline" asChild href="/onboarding/passport">
                Try Preference Passport
              </Button>
              <Button size="lg" variant="outline" asChild href="/shop/demo">
                See Live Demo
              </Button>
            </div>

            <div className="mt-10 relative rounded-xl overflow-hidden shadow-2xl border border-border">
              <img
                src="https://bakedbot.ai/demo-menu-hero.png"
                alt="BakedBot AI Demo Menu"
                className="w-full h-auto"
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">✓ Compliance-by-design</span>
              <span className="opacity-50">•</span>
              <span className="inline-flex items-center gap-1">✓ Headless SEO menus</span>
              <span className="opacity-50">•</span>
              <span className="inline-flex items-center gap-1">✓ Smokey recommendations</span>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {outcomes.map((o) => (
              <Card key={o.title}>
                <CardHeader>
                  <Icon label={o.iconLabel} />
                  <CardTitle className="mt-3">{o.title}</CardTitle>
                  <CardDescription>{o.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Buy the Core. Add agents when you need them.</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Start with what creates immediate leverage: a fast, indexable menu and an AI budtender that turns browsing into
              confident buying. Then layer in automation, analytics, compliance, and competitive intelligence.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild href="#pricing">
              View Pricing
            </Button>
            <Button asChild href="/get-started">
              Deploy Core
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {modules.map((m) => (
            <Card key={m.name}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Icon label={m.iconLabel} />
                  <div>
                    <CardTitle className="text-lg">{m.name}</CardTitle>
                    <CardDescription className="mt-1">{m.blurb}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {m.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-0.5">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Proof */}
      <section id="proof" className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Proof you can feel</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                We’re building for outcomes: more visibility, higher conversion, and less manual work.
              </p>
            </div>
            <Button variant="outline" asChild href="/case-studies">
              See case studies
            </Button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {proof.map((p) => (
              <Card key={p.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <CardDescription className="mt-1">{p.result}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Compliance is not a checkbox. It’s infrastructure.</h2>
            <p className="mt-2 text-muted-foreground">
              Deebo is our compliance engine. It pre-checks on-site content and outbound messaging against jurisdiction-aware
              rules—then records what happened for auditability.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>Pre-flight checks</Badge>
              <Badge>Audit trails</Badge>
              <Badge>Jurisdiction rule packs</Badge>
              <Badge>Approvals & controls</Badge>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Note: BakedBot helps teams reduce risk with automated checks and guardrails, but it is not legal advice.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Deebo checks</CardTitle>
              <CardDescription>Examples of guardrails across channels.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Icon label="Web" />
                  <div>
                    <div className="font-medium">Web + menus</div>
                    <div className="text-muted-foreground">
                      Age gating patterns, restricted claims, required disclaimers.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon label="Msg" />
                  <div>
                    <div className="font-medium">Email + SMS</div>
                    <div className="text-muted-foreground">
                      Channel rules, consent language, prohibited phrasing.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon label="Log" />
                  <div>
                    <div className="font-medium">Audit trail</div>
                    <div className="text-muted-foreground">
                      Records what was checked, which rules applied, and why.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Launch pricing (tiered usage + overage)</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                Predictable plans with included usage. When you outgrow the included limits, you pay transparent overages—no
                surprises.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild href="/pricing">
                Full details
              </Button>
              <Button asChild href="/get-started">
                Start Launch Plan
              </Button>
            </div>
          </div>

          <Tabs
            initial="tiers"
            tabs={[
              {
                key: "tiers",
                label: "Plans",
                content: (
                  <div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {pricingTiers.map((t) => (
                        <Card key={t.name}>
                          <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-lg">{t.name}</CardTitle>
                              <Badge className={t.badge === "Most Popular" ? "bg-foreground text-background" : ""}>
                                {t.badge}
                              </Badge>
                            </div>
                            <CardDescription className="mt-1">{t.highlight}</CardDescription>
                            <div className="mt-4">
                              {t.name === "Enterprise" ? (
                                <Price value={null} />
                              ) : (
                                <div>
                                  <Price value={t.priceLaunch} />
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    <span className="line-through mr-2">{formatMoney(t.priceLater ?? 0)}/mo</span>
                                    <span className="font-medium">Launch pricing</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Separator className="mb-4" />
                            <ul className="space-y-2 text-sm">
                              {t.includes.map((inc) => (
                                <li key={inc} className="flex gap-2">
                                  <span className="mt-0.5">✓</span>
                                  <span>{inc}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                          <CardFooter>
                            <Button className="w-full" asChild href={t.name === "Enterprise" ? "/contact" : "/get-started"}>
                              {t.name === "Enterprise" ? "Talk to Sales" : "Choose Plan"}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>

                    <p className="mt-6 text-xs text-muted-foreground">
                      Launch pricing is a temporary offer designed to gather real usage data. Plans include a monthly usage
                      allowance. If you exceed included usage, overages apply (see tab). You can upgrade at any time.
                    </p>
                  </div>
                ),
              },
              {
                key: "addons",
                label: "Add-ons",
                content: (
                  <div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {addOnPricing.map((a) => (
                        <Card key={a.name}>
                          <CardHeader>
                            <CardTitle className="text-lg">{a.name}</CardTitle>
                            <CardDescription>{a.note}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-end gap-2">
                              <span className="text-3xl font-semibold">{formatMoney(a.price)}</span>
                              <span className="text-sm text-muted-foreground pb-1">/mo</span>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                              Add-ons layer on top of your Core plan. Included usage stays the same—add-ons expand what you
                              can do.
                            </p>
                          </CardContent>
                          <CardFooter>
                            <Button variant="outline" className="w-full" asChild href="/get-started">
                              Add to Plan
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                    <p className="mt-6 text-xs text-muted-foreground">
                      Add-on pricing shown is launch pricing. Enterprise customers may bundle modules with custom limits and
                      support.
                    </p>
                  </div>
                ),
              },
              {
                key: "overages",
                label: "Overages",
                content: (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Transparent overages</CardTitle>
                      <CardDescription>Rates keep plans predictable while protecting performance at scale.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {overages.map((o) => (
                          <div key={o.k} className="rounded-2xl border border-border bg-background p-4">
                            <div className="text-sm font-medium">{o.k}</div>
                            <div className="text-sm text-muted-foreground mt-1">{o.v}</div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs text-muted-foreground">
                        We’ll never silently throttle your growth. You’ll see usage, limits, and projected overages in your
                        dashboard.
                      </p>
                    </CardContent>
                  </Card>
                ),
              },
            ]}
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Ready to turn your menu into a growth channel?</CardTitle>
            <CardDescription>
              Start with Core (Headless Menu + Smokey). Add Craig, Pops, Ezal, and Deebo when you want more automation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild href="/get-started">
                Start Launch Plan
              </Button>
              <Button size="lg" variant="outline" asChild href="/free-audit">
                Run a Free Audit
              </Button>
            </div>
          </CardContent>
        </Card>

        <footer className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {year} BakedBot AI</div>
          <div className="flex gap-4">
            <A href="/terms" className="hover:text-foreground">
              Terms
            </A>
            <A href="/privacy" className="hover:text-foreground">
              Privacy
            </A>
            <A href="/contact" className="hover:text-foreground">
              Contact
            </A>
          </div>
        </footer>
      </section>

      {/*
        Lightweight “tests” (no test runner needed):
        These run only in non-production environments to catch regressions.
      */}
      {process?.env?.NODE_ENV !== "production" ? (
        <TestHarness />
      ) : null}
    </div>
  );
}

function TestHarness() {
  // Add more tests here as you extract helper logic.
  // This avoids needing Jest/RTL in environments that don’t ship with them.
  const ok =
    formatMoney(99) === "$99" &&
    formatMoney(99.4) === "$99" &&
    formatMoney(99.6) === "$100" &&
    formatMoney(Number.POSITIVE_INFINITY) === "";

  // eslint-disable-next-line no-console
  console.assert(ok, "formatMoney() failed basic assertions");

  return null;
}
