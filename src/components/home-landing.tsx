
// src/components/home-landing.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function HomeLanding() {
  return (
    <main className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-display">
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
    </main>
  );
}
