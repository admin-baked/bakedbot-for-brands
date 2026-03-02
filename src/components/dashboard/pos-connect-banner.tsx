import { createServerClient } from '@/firebase/server-client';
import Link from 'next/link';
import { Zap, Plug, ArrowRight } from 'lucide-react';

interface PosConnectBannerProps {
    orgId: string;
}

/**
 * POS Connect Banner — shown on dispensary dashboard when POS is not yet connected.
 *
 * Three states:
 * 1. POS detected (e.g. Alleaves) but not connected → green "Connect Alleaves" banner
 * 2. No POS detected → neutral "Connect Your POS" banner
 * 3. POS already connected → nothing rendered
 */
export async function PosConnectBanner({ orgId }: PosConnectBannerProps) {
    try {
        const { firestore } = await createServerClient();
        const orgDoc = await firestore.collection('organizations').doc(orgId).get();

        if (!orgDoc.exists) return null;

        const data = orgDoc.data();
        const posProvider = data?.posProvider as string | undefined;
        const posConnected = data?.posConnected === true;

        // Already connected — nothing to show
        if (posConnected) return null;

        // POS detected but not connected
        if (posProvider) {
            const posName = POS_DISPLAY_NAMES[posProvider] || posProvider;
            return (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-emerald-800">
                                We detected you use {posName}!
                            </p>
                            <p className="text-sm text-emerald-600">
                                Connect now for real-time product sync, customer data, and order tracking.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/settings/integrations"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0"
                    >
                        Connect {posName}
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            );
        }

        // No POS detected — show generic connect banner
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Plug className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">
                            Connect Your Point of Sale
                        </p>
                        <p className="text-sm text-slate-500">
                            Sync your products, customers, and orders automatically. We support Alleaves, Dutchie, Treez, and more.
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard/settings/integrations"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 text-sm font-medium hover:bg-slate-100 transition-colors shrink-0"
                >
                    Connect POS
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    } catch {
        // Non-fatal — don't break dashboard if org read fails
        return null;
    }
}

const POS_DISPLAY_NAMES: Record<string, string> = {
    alleaves: 'Alleaves',
    dutchie: 'Dutchie',
    treez: 'Treez',
    meadow: 'Meadow',
    flowhub: 'Flowhub',
    blaze: 'Blaze',
    cova: 'Cova',
    jane: 'Jane',
    iheartjane: 'iHeartJane',
    weedmaps: 'Weedmaps',
};
