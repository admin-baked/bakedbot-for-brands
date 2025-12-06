// src/app/page.tsx
import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { PillarsSection } from '@/components/landing/pillars-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { ProofSection } from '@/components/landing/proof-section';
import { LandingFooter } from '@/components/landing/footer';
import { AgentShowcaseSection } from '@/components/landing/agent-showcase-section';
import { LocalSeoSection } from '@/components/landing/local-seo-section';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 pt-5 pb-20 w-full max-w-6xl">
        <HeroSection />
        <AgentShowcaseSection />
        <LocalSeoSection />
        <PillarsSection />
        <PricingSection />
        <ProofSection />
      </main>
      <LandingFooter />
    </div>
  );
}
