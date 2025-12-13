// [AI-THREAD P0-UX-DEMO-MODE]
// [Dev1-Claude @ 2025-11-29]:
//   Updated to redirect to working headless menu demo at /shop/demo
//   Uses a hardcoded demo dispensary ID that can be seeded with test data

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { trackUsageAction } from "@/app/actions/usage";

// Demo dispensary ID - this can be seeded with test products
const DEMO_DISPENSARY_ID = "demo-dispensary-001";

export function MenuPage({ brandId }: { brandId?: string }) {
  const router = useRouter();

  useEffect(() => {
    // Track usage
    if (brandId) {
      trackUsageAction(brandId, 'menu_pageviews');
    }

    // Redirect to the new Dispensary Menu Demo
    router.replace('/demo');
  }, [router, brandId]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading demo menu...</p>
      </div>
    </div>
  );
}
