
// src/app/product-locator/page.tsx

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function ProductLocatorPage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-teko tracking-wider uppercase">
          Product Locator
        </h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Find your favorite products at a dispensary near you. This feature is coming soon!
        </p>
      </div>

      <div className="mt-12 flex items-center justify-center">
        <Card className="w-full max-w-md text-center py-16">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit">
                    <Search className="h-8 w-8" />
                </div>
                <CardTitle className="mt-4">Coming Soon</CardTitle>
                <CardDescription>
                    Our advanced product locator will be available shortly to help you find exactly what you're looking for.
                </CardDescription>
            </CardHeader>
        </Card>
      </div>
    </main>
  );
}
