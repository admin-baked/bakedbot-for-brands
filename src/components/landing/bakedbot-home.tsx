import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Lock,
  Mail,
  QrCode,
  Repeat2,
  Shield,
} from 'lucide-react';

import { HeroClient } from '@/components/landing/hero-client';
import { PricingClient } from '@/components/landing/pricing-client';
import Logo from '@/components/logo';
import { ScrollTriggeredAuditPopup } from '@/components/audit/audit-popup';

const nav = [
  { label: 'Wedge', href: '#wedge' },
  { label: 'Proof', href: '#proof' },
  { label: 'System', href: '#system' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '/blog' },
];

const wedge = [
  {
    icon: QrCode,
    title: 'Capture more first-party customer data',
    desc: 'Launch QR and check-in flows that turn anonymous store traffic into activated customer records.',
  },
  {
    icon: Mail,
    title: 'Turn first visits into second visits',
    desc: 'Deploy welcome flows that move from first capture to proof of value quickly enough to support retention.',
  },
  {
    icon: Repeat2,
    title: 'Grow more repeat business',
    desc: 'Standardize lifecycle playbooks, weekly reviews, and accountable execution instead of relying on ad hoc campaigns.',
  },
];

const systemSteps = [
  {
    title: 'Capture',
    desc: 'Welcome Check-In Flow + QR capture bring first-party data into the system.',
  },
  {
    title: 'Activate',
    desc: 'Welcome Email Playbook turns first visits into a measurable second-visit motion.',
  },
  {
    title: 'Review',
    desc: 'Weekly operator reporting keeps owners focused on customer capture, conversion, and repeat revenue.',
  },
  {
    title: 'Improve',
    desc: 'Retention playbooks, compliance review, and KPI packs tighten the loop without broad platform sprawl.',
  },
];

const proofCards = [
  {
    title: 'Faster proof windows',
    desc: 'Operator plans are sold with a 30-day launch target and a 45-60 day performance review instead of vague AI promises.',
  },
  {
    title: 'Named operating cadence',
    desc: 'Every premium account has a launch plan, weekly review, KPI pack, and a clear owner on the BakedBot side.',
  },
  {
    title: 'Mission without ceiling',
    desc: 'Access keeps social-equity-friendly entry points alive while Operator pricing supports the path to $1M ARR.',
  },
];

function AuthButtons() {
  return (
    <div className="flex gap-2">
      <Button variant="ghost" asChild className="hidden rounded-xl sm:inline-flex" size="sm">
        <a href="/signin">Login</a>
      </Button>
      <Button asChild className="rounded-xl shadow-sm" size="sm">
        <a href="/book/martez">Book Martez</a>
      </Button>
    </div>
  );
}

export function BakedBotHome() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-emerald-500/30">
      <ScrollTriggeredAuditPopup />

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo height={32} />
            <Badge variant="outline" className="hidden bg-emerald-500/5 text-emerald-600 border-emerald-500/20 sm:inline-flex">
              Operator Wedge
            </Badge>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <AuthButtons />
        </div>
      </header>

      <HeroClient />

      <section id="wedge" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
              The Wedge
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              BakedBot wins by owning one sharp revenue loop first.
            </h2>
            <p className="text-lg text-muted-foreground">
              We are not leading with a broad AI-commerce stack. We are leading with customer capture,
              welcome activation, and repeat revenue for dispensaries that already have traffic but weak follow-up.
            </p>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-xl px-6">
            <a href="/ai-retention-audit">Run the AI Retention Audit</a>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {wedge.map((item) => (
            <Card key={item.title} className="border-border/60 shadow-sm">
              <CardHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="proof" className="border-y border-border/50 bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 max-w-3xl space-y-4">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
              Proof
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Sell proof, not possibility.</h2>
            <p className="text-lg text-muted-foreground">
              The premium offer has to feel like accountable execution with a launch plan, KPI pack, and a visible proof window.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {proofCards.map((item) => (
              <Card key={item.title} className="border-border/60 bg-background/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
              How It Works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              A managed revenue activation system, not a feature bundle.
            </h2>
            <p className="text-lg text-muted-foreground">
              Operator plans combine software, launch support, reporting, compliance review, and weekly operating cadence so dispensaries do not have to stitch the loop together alone.
            </p>

            <div className="space-y-4">
              {systemSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-border/60 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-300" />
                Operator Commitments
              </CardTitle>
              <CardDescription className="text-slate-300">
                Every premium offer carries a named owner, launch plan, weekly review cadence, and 30-60 day proof model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                'Launch within 30 days',
                'Weekly operator reporting',
                'Monthly optimization review',
                'Defined KPI pack for every account',
                'Compliance review on outbound workflows',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm text-slate-100">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="compliance" className="border-y border-border/50 bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1fr,1.1fr] lg:items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
                Compliance & Trust
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Compliance is part of the revenue system.
              </h2>
              <p className="text-lg text-muted-foreground">
                Deebo reviews outbound workflows, welcome motions, and retention playbooks so the system can move quickly without becoming reckless.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Compliance checks stay attached to the workflows that drive capture, welcome, and retention.
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    Reporting
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Weekly reports keep operator teams focused on measurable lift instead of feature activity.
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    Auditability
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  The execution layer stays traceable, accountable, and easier to defend in a regulated market.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
            Access vs Operator
          </Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Access builds trust. Operator builds the company.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Keep self-serve and mission-aligned entry points visible, but sell the premium lane as managed revenue activation with accountable execution.
          </p>
        </div>

        <PricingClient />
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Badge variant="outline" className="bg-slate-900 text-white border-slate-900">
          CTA Paths
        </Badge>
        <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
          Start with proof or book the operating layer.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Use the audit if you need to prove the wedge. Book Martez if you already know the real issue is weak capture, weak welcome, and weak follow-up.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base font-semibold">
            <a href="/ai-retention-audit">Run the AI Retention Audit</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-8 text-base font-semibold">
            <a href="/book/martez">
              Book a Strategy Call
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/40 bg-background/50 py-12 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
          <div>
            <p className="font-semibold">BakedBot AI</p>
            <p className="text-sm text-muted-foreground">Access builds trust. Operator builds the company.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <a href="/pricing" className="hover:text-foreground">Pricing</a>
            <a href="/ai-retention-audit" className="hover:text-foreground">AI Retention Audit</a>
            <a href="/book/martez" className="hover:text-foreground">Book Martez</a>
            <a href="/blog" className="hover:text-foreground">Blog</a>
          </div>
          <p className="text-sm text-muted-foreground">© {year} BakedBot AI</p>
        </div>
      </footer>
    </div>
  );
}
