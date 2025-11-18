

import DispensaryLocator from '@/src/components/dispensary-locator';
import { demoRetailers } from '@/lib/data';

export default function ProductLocatorPage() {
  const locations = demoRetailers;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Locator
        </h1>
        <p className="text-sm text-muted-foreground">
          Find nearby dispensaries that carry your products.
        </p>
      </div>
      <div className="mt-8">
        <DispensaryLocator locations={locations} />
      </div>
    </main>
  );
}
