

'use client';

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from 'next/link';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Chatbot from "@/components/chatbot";
import { demoProducts } from "@/lib/demo/demo-data";
import { DEMO_BRAND_ID } from "@/lib/config";
import Header from "@/components/header";
import { Footer } from "@/components/footer";

export default function RootHomepage() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'homeHero');
  const featuredProducts = [...demoProducts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);

  return (
    <>
    <Header />
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main>
        {/* Hero – AI Budtender widget as the star */}
        <section className="relative overflow-hidden border-b">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary))_0%,_transparent_45%),_radial-gradient(circle_at_bottom,_hsl(var(--accent))_0%,_transparent_50%)] opacity-20" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-16 md:flex-row md:items-center md:pb-24 md:pt-20">
            <div className="md:w-1/2">
              <p className="mb-3 inline-flex items-center rounded-full border border-primary/40 bg-background/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                New · Headless Menu + AI Budtender
              </p>
              <h1 className="mb-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                Keep the customer in your
                <span className="bg-gradient-to-r from-primary via-accent to-secondary-foreground bg-clip-text text-transparent">
                  {" "}
                  brand funnel
                </span>
              </h1>
              <p className="mb-6 max-w-xl text-sm text-muted-foreground md:text-base">
                Launch a headless menu with your own AI agent budtender, capture first-party customer data, and route
                compliant orders to partner dispensaries—so shoppers stay in your experience, even when retailers
                fulfill the order.
              </p>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Link href="/onboarding" passHref>
                    <Button className="rounded-full px-5 py-2 text-sm font-semibold shadow-[0_0_30px_hsl(var(--primary)/0.5)]">Get started free</Button>
                </Link>
                <Link href="/menu/default" passHref>
                    <Button variant="outline" className="rounded-full px-4 py-2 text-sm">Watch 2-min demo</Button>
                </Link>
              </div>

              <p className="text-[11px] text-muted-foreground/80">
                Own the customer relationship · Dispensaries still compliantly fulfill the order
              </p>

              <div className="mt-8 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>First-party data · name, email, preferences</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Customers stay on your brand funnel, not a marketplace</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Orders sent via email, tablet, or POS integration</span>
                </div>
              </div>
            </div>

            {/* Hero visual – screenshot of AI Budtender widget */}
            <div className="md:w-1/2">
              <div className="mx-auto max-w-md rounded-3xl border bg-background/40 p-2 shadow-[0_40px_120px_hsla(var(--primary),0.4)]">
                <div className="overflow-hidden rounded-2xl border bg-background/80">
                  {heroImage ? (
                     <Image
                        src={heroImage.imageUrl}
                        alt={heroImage.description}
                        className="h-full w-full object-cover"
                        width={800}
                        height={700}
                        priority
                        data-ai-hint={heroImage.imageHint}
                      />
                  ) : (
                    <div className="h-[700px] w-[800px] bg-muted" />
                  )}
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
                Example: customers browse products, talk to your AI budtender, and send carts to the dispensary—without
                ever leaving your brand experience.
              </p>
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section id="features" className="border-b bg-background">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                  Everything your brand needs in one console
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Keep products, partners, pricing, and purchasing in sync across your entire footprint—without
                  adding headcount.
                </p>
              </div>
              <p className="text-xs text-muted-foreground/80">
                Built for brand owners and portfolio managers who live in spreadsheets today.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Headless brand menu</p>
                <p className="mt-2 text-sm font-semibold">
                  Own the shopping experience, share the fulfillment
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Embed a shoppable menu anywhere your customers discover you. Capture first-party data while routing
                  orders to partner dispensaries for compliant fulfillment.
                </p>
              </div>

              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary">AI agent budtender</p>
                <p className="mt-2 text-sm font-semibold">
                  A digital budtender that never swaps your product
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Guide shoppers to the right SKU with conversational recommendations—before they ever talk to an
                  in-store budtender who might push a competing brand.
                </p>
              </div>

              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
                  Brand intelligence console
                </p>
                <p className="mt-2 text-sm font-semibold">
                  The mission control for pricing &amp; partners
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Daily menu scans, pricing guardrails, and reorder signals keep your catalog clean and your wholesale
                  relationships humming in the background.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Intelligence Console */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-center">
            <div className="md:w-1/2">
              <h3 className="text-lg font-semibold tracking-tight md:text-xl">
                Brand Intelligence Console: your command center
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                While the headless menu and AI budtender talk to customers, the console watches everything in the
                background—pricing, menu accuracy, and reorder signals—so you can run tighter operations with less
                manual work.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li>• Daily scans of every connected dispensary menu</li>
                <li>• MSRP and pricing guardrails so your brand doesn&apos;t get discounted away</li>
                <li>• Reorder suggestions based on actual retail movement, not guesswork</li>
              </ul>
            </div>

            <div className="md:w-1/2">
              <div className="mx-auto max-w-md rounded-3xl border bg-background/70 p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Brand Intelligence Console</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Agents online
                  </span>
                </div>

                <div className="grid gap-3 text-xs">
                  <div className="rounded-2xl border bg-background/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Pricing Monitor</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        Live
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-sm font-semibold">37</p>
                        <p className="text-[11px] text-muted-foreground">menus scanned this morning</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">12</p>
                        <p className="text-[11px] text-muted-foreground">price mismatches flagged</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border bg-background/60 p-3">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Menu Sync</p>
                      <p className="text-sm font-semibold">94% accuracy</p>
                      <p className="text-[11px] text-muted-foreground">across connected dispensaries</p>
                    </div>
                    <div className="rounded-2xl border bg-background/60 p-3">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Reorder Signals</p>
                      <p className="text-sm font-semibold">18 locations</p>
                      <p className="text-[11px] text-muted-foreground">predicted to restock this week</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border-primary/40 bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Next action</p>
                      <span className="text-[11px] text-primary/80">AI suggestion</span>
                    </div>
                    <p className="text-xs text-foreground/90">
                      6 partner dispensaries are low on{" "}
                      <span className="font-semibold">Nebula Nugs 3.5g</span>. Send suggested reorder quantities now?
                    </p>
                    <div className="mt-3 flex gap-2 text-[11px]">
                      <Link href="/dashboard/orders" passHref>
                        <Button className="flex-1 rounded-full px-3 py-1 font-semibold text-primary-foreground">
                          Review &amp; send orders
                        </Button>
                      </Link>
                      <Button variant="outline" className="rounded-full px-3 py-1">
                        Snooze
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Chatbot products={featuredProducts} brandId={DEMO_BRAND_ID} />
    </div>
    <Footer />
    </>
  );
}
