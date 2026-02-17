/**
 * Loyalty Tablet Layout
 * Full-screen, no navigation, dark BakedBot branding.
 * Designed for an iPad or Android tablet at the dispensary counter.
 */

export default function LoyaltyTabletLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-[#0f0f1a] text-white overflow-hidden">
            {children}
        </div>
    );
}
