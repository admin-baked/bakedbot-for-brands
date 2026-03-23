import { DispensaryLocatorSection } from '@/components/dispensary-locator-section';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dispensary & Product Locator | BakedBot AI',
    description: 'Find licensed cannabis dispensaries and specific products near you with the BakedBot AI locator.',
};

export default function ProductLocatorPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <DispensaryLocatorSection />
      <section className="space-y-2 text-center md:text-left">
        <h2 className="font-display text-xl">
          White-label locator for your brand
        </h2>
        <p className="text-sm text-gray-600 max-w-xl">
          This is the stand-alone locator experience brands embed on
          their site and link from social, SMS, and email campaigns.
        </p>
      </section>
    </main>
  );
}
