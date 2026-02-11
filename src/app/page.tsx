import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Terminal, Zap, FileSpreadsheet, Scale, Lock, RefreshCw, BarChart3, Mail, MessageSquare } from "lucide-react";

import { HeroClient } from "@/components/landing/hero-client";
import { PricingClient } from "@/components/landing/pricing-client";
import Logo from "@/components/logo";

// Navigation Links
const nav = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Proof", href: "#proof" },
  { label: "Compliance", href: "#compliance" },
];

function AuthButtons() {
  // This is simple enough to stay if it doesn't use hooks that break server components
  // BUT useUser is a hook, so AuthButtons needs to be extracted or this file stays client
  // Strategy: Extract AuthButtons to a client component
  return (
    <div className="flex gap-2">
      <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-xl" size="sm">
        <a href="/signin">Login</a>
      </Button>
      <Button asChild className="rounded-xl shadow-sm" size="sm">
        <a href="/get-started">Get Started</a>
      </Button>
    </div>
  );
}

// Static Data Sections
const outcomes = [
  {
    icon: Search,
    title: "Get found on Google",
    desc: "Headless, SEO-first menus and product pages built to rank and load fast.",
  },
  {
    icon: Zap,
    title: "Convert confused shoppers",
    desc: "Smokey recommends the right products and routes customers to checkout-ready carts.",
  },
  {
    icon: Scale,
    title: "Grow without compliance chaos",
    desc: "Deebo pre-checks marketing and on-site content with jurisdiction-aware guardrails.",
  },
];

const modules = [
  {
    icon: Zap,
    name: "Core: Headless Menu + Smokey",
    blurb: "Your menu becomes a revenue channel: searchable pages, real-time inventory sync, and an AI budtender.",
    bullets: [
      "SEO-first headless menu",
      "Smokey AI budtender",
      "Real-time inventory sync",
      "Basic analytics",
    ],
  },
  {
    icon: Mail,
    name: "Add-on: Craig (Marketing)",
    blurb: "Lifecycle email + SMS workflows that stay warm, not spammy, and checked before sending.",
    bullets: [
      "Welcome + winback workflows",
      "Segmentation playbooks",
      "Engagement tracking",
      "Deebo compliance checks",
    ],
  },
  {
    icon: BarChart3,
    name: "Add-on: Pops (Analytics)",
    blurb: "Turn data into decisions: dashboards, insights, and forecasting you can act on.",
    bullets: [
      "Revenue dashboards",
      "Retention insights",
      "Demand forecasting",
      "Exportable reports",
    ],
  },
  {
    icon: RefreshCw,
    name: "Add-on: Ezal (Intelligence)",
    blurb: "Track competitor pricing and availability, then respond with smarter positioning.",
    bullets: [
      "Competitor menu tracking",
      "Price alerts",
      "Category comparisons",
      "Weekly summary",
    ],
  },
  {
    icon: Lock,
    name: "Add-on: Deebo Pro (Compliance)",
    blurb: "Policy packs, audit trails, and compliance checks across channels.",
    bullets: [
      "Jurisdiction rule packs",
      "Audit trail + export",
      "Cross-channel checks",
      "Approval workflows",
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

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo height={32} />
            <Badge variant="outline" className="ml-2 hidden sm:inline-flex border-emerald-500/20 text-emerald-600 bg-emerald-500/5">Beta</Badge>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition-colors hover:scale-105 transform duration-200">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <AuthButtons />
          </div>
        </div>
      </header>

      {/* Hero Section (Client Component) */}
      <HeroClient />

      {/* Product Section */}
      <section id="product" className="mx-auto max-w-6xl px-4 py-20 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="space-y-4 max-w-2xl">
            <Badge variant="outline" className="w-fit bg-blue-500/10 text-blue-600 border-blue-500/20">Modular Platform</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Buy the Core. Add agents as you grow.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Start with what creates immediate leverage: a fast, indexable menu and an AI budtender.
              Then layer in automation, analytics, compliance, and competitive intelligence when you're ready.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild className="rounded-xl h-11 px-6">
              <a href="#pricing">View Pricing</a>
            </Button>
            <Button asChild className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
              <a href="/get-started">Deploy Core</a>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.name} className="glass-card hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <Icon size={20} />
                    </div>
                    <CardTitle className="text-lg font-bold">{m.name.split(':')[0]}</CardTitle>
                  </div>
                  <CardDescription className="text-base leading-relaxed">{m.blurb}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {m.bullets.map((b) => (
                      <li key={b} className="flex gap-3 items-center text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Proof Section */}
      <section id="proof" className="bg-muted/30 border-y border-border/50 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="mx-auto max-w-6xl px-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit bg-purple-500/10 text-purple-600 border-purple-500/20">Case Studies</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Proof you can feel</h2>
              <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                We're building for outcomes: more visibility, higher conversion, and less manual work.
              </p>
            </div>
            <Button variant="outline" asChild className="rounded-xl">
              <a href="/case-studies">See case studies</a>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {proof.map((p) => (
              <Card key={p.name} className="glass-card bg-background/50 hover:bg-background/80 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">{p.name}</CardTitle>
                  <CardDescription className="text-base mt-2 text-foreground/80 font-medium">{p.result}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="w-fit bg-red-500/10 text-red-600 border-red-500/20">Safety First</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Compliance is not a checkbox.<br />It's infrastructure.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Deebo is our compliance engine. It pre-checks on-site content and outbound messaging against jurisdiction-aware
              rules, then records what happened for auditability.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Pre-flight checks', 'Audit trails', 'Jurisdiction rule packs', 'Approvals & controls'].map(tag => (
                <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm bg-muted/50 hover:bg-muted text-foreground/80 border border-border/50">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Card className="glass-card bg-gradient-to-br from-card to-muted/20 border-border/60">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                What Deebo checks
              </CardTitle>
              <CardDescription>Examples of guardrails blocking risks before they happen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4 group">
                  <div className="p-3 rounded-xl bg-background border border-border/50 shadow-sm group-hover:border-emerald-500/30 transition-colors">
                    <Terminal className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Web + Menus</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Age gating patterns, restricted claims, required disclaimers.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 group">
                  <div className="p-3 rounded-xl bg-background border border-border/50 shadow-sm group-hover:border-emerald-500/30 transition-colors">
                    <MessageSquare className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Email + SMS</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Channel rules, consent language, prohibited phrasing ("Free", "Guaranteed", etc).
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 group">
                  <div className="p-3 rounded-xl bg-background border border-border/50 shadow-sm group-hover:border-emerald-500/30 transition-colors">
                    <FileSpreadsheet className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Audit Trail</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Immutable log of what was checked, which rules applied, and why.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section (Client Component) */}
      <section id="pricing" className="bg-muted/20 border-y border-border/50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Transparent Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Launch pricing</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Predictable plans with included usage. When you outgrow the included limits, you pay transparent overages with no surprises.
            </p>
          </div>

          <PricingClient />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-background/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo height={28} />
            <span className="text-sm text-muted-foreground">Copyright {year} BakedBot AI</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/status" className="hover:text-foreground transition-colors">System Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
