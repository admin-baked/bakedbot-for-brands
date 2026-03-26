import Image from 'next/image';
import { ArrowRight, Bot, Building2, CheckCircle2, MessageSquare, PlayCircle, Sparkles, Store } from 'lucide-react';
import { LandingFooter } from '@/components/landing/footer';
import { Navbar } from '@/components/landing/navbar';
import { PageViewTracker, TrackableButton } from '@/components/analytics/PageViewTracker';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MCBA_ONBOARDING_HREF,
  MCBA_PAGE_ID,
  MCBA_PAGE_SLUG,
  MCBA_RECAP_PUBLIC_URL,
  MCBA_SMOKEY_PUBLIC_URL,
} from '@/lib/constants/mcba-power-hour-ama';

const brandBullets = [
  'Ask how BakedBot helps brands find accounts, tighten sell-through, and create compliant creative faster.',
  'See how your team can turn one platform into campaign strategy, pricing signals, and wholesale follow-up.',
  'Walk away with a live onboarding path that starts you with 150 free AI credits.',
];

const dispensaryBullets = [
  'See how operators use BakedBot to move faster on menu updates, campaigns, customer retention, and team workflows.',
  'Ask direct questions about retail execution, staffing leverage, and where AI fits into real dispensary operations.',
  'Finish signup through the standard platform flow and claim 150 free AI credits for your workspace.',
];

const amaTopics = [
  'How brands and dispensaries can use the same AI operating layer without losing their unique workflows',
  'Where Martez sees cannabis AI creating margin, speed, and consistency this year',
  'How BakedBot approaches compliance-aware creative, sales enablement, and retail execution',
  'What early operators should automate first if they want a fast ROI instead of a science project',
];

const offerSteps = [
  {
    title: 'Sign up from the AMA page',
    description: 'Use the MCBA event CTA so your onboarding flow keeps the correct campaign attribution.',
  },
  {
    title: 'Finish your normal onboarding',
    description: 'There is no parallel event registration path. You land in the same BakedBot onboarding flow everyone uses.',
  },
  {
    title: 'Start with 150 free credits',
    description: 'Eligible brand and dispensary workspaces receive the one-time credit grant automatically after onboarding completes.',
  },
];

const highlightChips = [
  'Built for brands',
  'Built for dispensaries',
  '150 free credits',
];

export function MCBAPowerHourPage() {
  return (
    <div className="min-h-screen bg-[#f4f4ef] text-slate-950">
      <Navbar />
      <PageViewTracker pageType="campaign" pageId={MCBA_PAGE_ID} pageSlug={MCBA_PAGE_SLUG} />

      <main className="overflow-hidden">
        <section className="relative border-b border-emerald-950/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.14),_transparent_38%),linear-gradient(180deg,_#f7f8f2_0%,_#eef1e4_100%)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-700/60 to-transparent" />
          <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800 shadow-sm">
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">MCBA</span>
                  <span>x BakedBot.ai</span>
                </div>

                <h1 className="mt-6 max-w-4xl font-teko text-5xl uppercase leading-[0.95] tracking-tight text-slate-950 md:text-7xl">
                  Power Hour AMA with
                  <span className="block text-emerald-700">Martez Knox</span>
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  A fast, practical session for cannabis brands and dispensaries that want to see how BakedBot.ai
                  turns AI into execution, not theory. Sign up after the AMA and your team gets 150 free credits to
                  start inside the platform.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <TrackableButton
                    pageType="campaign"
                    pageId={MCBA_PAGE_ID}
                    clickType="cta"
                    clickTarget={MCBA_ONBOARDING_HREF}
                    href={MCBA_ONBOARDING_HREF}
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'h-12 rounded-full bg-slate-950 px-7 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] hover:bg-emerald-800'
                    )}
                  >
                    Claim 150 free credits
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </TrackableButton>

                  <a
                    href="#media"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      'h-12 rounded-full border-emerald-900/15 bg-white/80 px-7 text-sm font-semibold text-slate-900 hover:bg-white'
                    )}
                  >
                    Watch the reel
                    <PlayCircle className="ml-2 h-4 w-4" />
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  {highlightChips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-full border border-slate-900/10 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      {chip}
                    </div>
                  ))}
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
                    <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ask direct</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Bring questions about growth, retail operations, marketing, AI adoption, and what is actually working.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
                    <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700">
                      <Bot className="h-5 w-5" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">See the product</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Watch how BakedBot speaks to both sides of the market without forcing brands and dispensaries into the same playbook.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_18px_35px_rgba(15,23,42,0.08)]">
                    <div className="mb-3 inline-flex rounded-2xl bg-slate-900 p-3 text-white">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Start with credit</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Eligible new brand and dispensary workspaces receive a one-time 150-credit boost after onboarding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-8 top-10 hidden h-28 w-28 rounded-full bg-emerald-300/35 blur-3xl lg:block" />
                <div className="absolute -right-6 bottom-0 hidden h-32 w-32 rounded-full bg-slate-900/15 blur-3xl lg:block" />

                <div className="relative overflow-hidden rounded-[32px] border border-slate-900/10 bg-[#123127] p-6 text-white shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
                  <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),transparent_55%)]" />
                  <div className="relative flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Hosted by</p>
                      <p className="mt-1 text-lg font-semibold">Martez Knox, CEO of BakedBot.ai</p>
                    </div>
                    <Image
                      src="/bakedbot-logo-horizontal.png"
                      alt="BakedBot.ai"
                      width={164}
                      height={42}
                      className="h-auto w-28 md:w-36"
                    />
                  </div>

                  <div className="mt-6 grid gap-5 sm:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Who should be in the room</p>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-start gap-3 rounded-2xl bg-black/15 px-4 py-3">
                          <Building2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                          <div>
                            <p className="font-semibold">Brands</p>
                            <p className="text-sm text-emerald-50/80">Growth, sell-through, account visibility, and faster creative execution.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl bg-black/15 px-4 py-3">
                          <Store className="mt-0.5 h-5 w-5 text-emerald-300" />
                          <div>
                            <p className="font-semibold">Dispensaries</p>
                            <p className="text-sm text-emerald-50/80">Retail operations, retention, menu marketing, and daily workflow leverage.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] px-4 pt-6">
                      <div className="absolute inset-x-4 top-4 flex justify-end">
                        <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                          Smokey on deck
                        </div>
                      </div>
                      <Image
                        src="/assets/agents/smokey-main.png"
                        alt="Smokey by BakedBot"
                        width={640}
                        height={640}
                        priority
                        className="mx-auto mt-6 h-auto w-full max-w-sm object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Built for both sides</p>
              <h2 className="mt-3 max-w-2xl font-teko text-4xl uppercase leading-none tracking-tight text-slate-950 md:text-5xl">
                One AMA. Two operating realities.
              </h2>
            </div>
            <p className="hidden max-w-xl text-sm leading-6 text-slate-600 lg:block">
              The page and the product path both stay explicit about who is in the room: cannabis brands and dispensaries.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[30px] border border-emerald-900/10 bg-white p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">For brands</p>
                  <h3 className="font-teko text-3xl uppercase text-slate-950">Find faster ways to win at retail</h3>
                </div>
              </div>
              <ul className="mt-6 space-y-4">
                {brandBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[30px] border border-slate-900/10 bg-[#101c17] p-7 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-emerald-300">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">For dispensaries</p>
                  <h3 className="font-teko text-3xl uppercase text-white">Operate with more leverage, not more chaos</h3>
                </div>
              </div>
              <ul className="mt-6 space-y-4">
                {dispensaryBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-emerald-50/85">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-300" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section id="media" className="border-y border-slate-900/10 bg-[#e9eddc]">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Media reel</p>
              <h2 className="mt-3 font-teko text-4xl uppercase leading-none tracking-tight text-slate-950 md:text-5xl">
                Event energy, real product motion, and the BakedBot voice
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                Use the reel to get a feel for the brand, the audience, and the kind of practical conversation this AMA is built for.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <article className="overflow-hidden rounded-[28px] border border-white/70 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Video 01</p>
                    <h3 className="font-teko text-3xl uppercase text-slate-950">BakedBot NECANN recap</h3>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Booth momentum
                  </div>
                </div>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  title="BakedBot NECANN recap video"
                  className="aspect-video w-full rounded-[22px] bg-slate-950 object-cover"
                  src={MCBA_RECAP_PUBLIC_URL}
                />
              </article>

              <article className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[#111b17] p-4 text-white shadow-[0_22px_55px_rgba(15,23,42,0.18)]">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Video 02</p>
                    <h3 className="font-teko text-3xl uppercase text-white">Smokey AI spotlight</h3>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    Agent reveal
                  </div>
                </div>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  title="Smokey AI campaign video"
                  className="aspect-video w-full rounded-[22px] bg-black object-cover"
                  src={MCBA_SMOKEY_PUBLIC_URL}
                />
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="rounded-[32px] border border-slate-900/10 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">150 free credits</p>
              <h2 className="mt-3 font-teko text-4xl uppercase leading-none tracking-tight text-slate-950 md:text-5xl">
                Turn AMA momentum into a real workspace
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-700 md:text-base">
                This page is built to convert the conversation into action. The offer is simple: sign up, finish your onboarding, and start using the platform with free credits already in place.
              </p>

              <div className="mt-8 grid gap-4">
                {offerSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 rounded-3xl border border-slate-900/10 bg-[#f5f7ef] p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-emerald-900/10 bg-[#113225] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">AMA topics</p>
              <h2 className="mt-3 font-teko text-4xl uppercase leading-none tracking-tight text-white md:text-5xl">
                What attendees can ask Martez
              </h2>
              <ul className="mt-8 space-y-4">
                {amaTopics.map((topic) => (
                  <li key={topic} className="flex items-start gap-3 text-sm leading-6 text-emerald-50/85">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-300" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 md:px-6 md:pb-20">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-slate-900/10 bg-[linear-gradient(135deg,_#0f172a_0%,_#102d1f_52%,_#1a5c3a_100%)] px-6 py-10 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)] md:px-10 md:py-12">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">Ready when you are</p>
                <h2 className="mt-3 font-teko text-4xl uppercase leading-none tracking-tight text-white md:text-6xl">
                  Bring the AMA into your actual operating stack
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/85 md:text-base">
                  The fastest next step is the real one: go through onboarding, get your workspace provisioned, and let the 150-credit offer carry the first sprint.
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:items-end">
                <TrackableButton
                  pageType="campaign"
                  pageId={MCBA_PAGE_ID}
                  clickType="cta"
                  clickTarget={MCBA_ONBOARDING_HREF}
                  href={MCBA_ONBOARDING_HREF}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-12 rounded-full bg-white px-7 text-sm font-semibold text-slate-950 hover:bg-emerald-50'
                  )}
                >
                  Start onboarding with 150 credits
                  <ArrowRight className="ml-2 h-4 w-4" />
                </TrackableButton>
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">
                  Brands and dispensaries only. One-time campaign grant.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
