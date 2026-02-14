// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

/**
 * Brand Creative Page - Redirects to main Creative Command Center
 *
 * This route redirects to the unified Creative Command Center at /dashboard/creative
 * which includes all latest features:
 * - Multi-platform workflow (Instagram, TikTok, LinkedIn)
 * - Craig (Marketer) + Pinky (Visual Artist) AI agents
 * - Deebo compliance checking
 * - Campaign templates
 * - Hashtag suggestions
 * - Image upload with drag-and-drop
 * - Batch campaign mode
 * - QR code scan analytics
 * - Menu item autocomplete
 * - Real-time Firestore integration
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BrandCreativePage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to main Creative Command Center
        router.replace('/dashboard/creative');
    }, [router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Redirecting to Creative Command Center...</p>
            </div>
        </div>
    );
}
