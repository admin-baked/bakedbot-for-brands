
// components/home-landing.tsx
import { BotMessageSquare, Store, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


export function HomeLanding() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Keep the customer in your brand funnel.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    BakedBot is the agentic commerce OS for cannabis brands. Deploy AI agents to automate marketing, manage retail channels, and own the customer relationship.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                    <Button asChild size="lg">
                        <Link href="/onboarding">Get started free</Link>
                    </Button>
                     <Button asChild variant="outline" size="lg">
                        <Link href="/menu/default">See the Demo</Link>
                    </Button>
                </div>
              </div>
              <Image
                src="https://bakedbot.ai/wp-content/uploads/2025/11/BakedBot-AI-11-21-2025_08_51_AM.png"
                width="550"
                height="550"
                alt="Hero"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
                data-ai-hint="AI budtender"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted-foreground/10 px-3 py-1 text-sm">Our Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">An OS for Modern Cannabis Brands</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From AI-powered recommendations to unified retail channel management, BakedBot gives you the tools to build a direct-to-consumer experience, fulfilled by your retail partners.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-3 pt-12">
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                    <BotMessageSquare className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-bold">AI Budtender</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    Provide expert, compliant product recommendations with our intelligent chatbot, Smokey.
                </p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                    <Store className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-bold">Headless Menu</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    Own your customer experience with a customizable, embeddable menu for your brand website.
                </p>
              </div>
              <div className="grid gap-1">
                 <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-bold">Unified Customer View</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    Consolidate customer interactions from all your retail partners into a single view.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
