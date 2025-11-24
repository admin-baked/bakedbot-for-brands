// src/components/home-landing.tsx
import Link from 'next/link';
import { Button } from './ui/button';

export function HomeLanding() {
  return (
    <main className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-teko text-4xl md:text-6xl font-bold text-center uppercase tracking-wider">
        The Agentic Commerce OS <br/> for Cannabis Brands
      </h1>

      <p className="font-sans text-lg md:text-xl max-w-3xl text-center text-muted-foreground">
        Smokey (AI budtender), Craig (marketer), Pops (analyst), Ezal (lookout), Deebo (compliance), Money
        Mike (pricing), and Mrs. Parker (loyalty) working your funnel 24/7.
      </p>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button asChild size="lg">
          <Link href="/onboarding">
            Get started free
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/menu/default">
            View Live Demo
          </Link>
        </Button>
      </div>
    </main>
  );
}
