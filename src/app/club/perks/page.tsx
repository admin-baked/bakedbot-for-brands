'use client';

import { useClub } from '../components/ClubProvider';
import { Gift, Clock, Percent, Tag, Cake, Star, Lock } from 'lucide-react';
import type { Reward } from '@/types/club';

const REWARD_ICONS: Record<Reward['rewardType'], typeof Gift> = {
    discount_percent: Percent,
    discount_amount: Tag,
    free_item: Gift,
    tier_perk: Star,
    birthday_reward: Cake,
    welcome_reward: Gift,
};

function isExpiringSoon(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function formatExpiry(expiresAt?: string): string | null {
    if (!expiresAt) return null;
    return new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ClubPerksPage() {
    const { rewards, loading } = useClub();

    if (loading) {
        return <PerksLoadingSkeleton />;
    }

    const available = rewards.filter(r => r.status === 'available');
    const locked = rewards.filter(r => r.status === 'locked');
    const hasAny = available.length > 0 || locked.length > 0;

    return (
        <div className="px-4 pt-6 space-y-6">
            <h1 className="text-xl font-bold">Perks</h1>

            {!hasAny && <EmptyPerks />}

            {available.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-emerald-400">Available Now</h2>
                    {available.map(r => <RewardCard key={r.id} reward={r} />)}
                </section>
            )}

            {locked.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-white/40">Coming Soon</h2>
                    {locked.map(r => <RewardCard key={r.id} reward={r} />)}
                </section>
            )}

            {/* Powered by */}
            <p className="text-center text-[10px] text-white/20 pt-4 pb-2">
                Powered by BakedBot
            </p>
        </div>
    );
}

function RewardCard({ reward }: { reward: Reward }) {
    const Icon = REWARD_ICONS[reward.rewardType] ?? Gift;
    const isLocked = reward.status === 'locked';
    const expiring = isExpiringSoon(reward.expiresAt);
    const expiryLabel = formatExpiry(reward.expiresAt);

    return (
        <div className="rounded-xl p-4 flex items-start gap-3"
             style={{
                 background: isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                 border: `1px solid ${isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(34,197,94,0.2)'}`,
                 opacity: isLocked ? 0.6 : 1,
             }}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isLocked ? 'bg-white/5' : 'bg-emerald-500/15'
            }`}>
                {isLocked ? (
                    <Lock size={18} className="text-white/30" />
                ) : (
                    <Icon size={18} className="text-emerald-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{reward.title}</p>
                    {expiring && !isLocked && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-semibold whitespace-nowrap">
                            <Clock size={10} />
                            Expiring
                        </span>
                    )}
                </div>
                {reward.description && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{reward.description}</p>
                )}
                {expiryLabel && !isLocked && (
                    <p className="text-[10px] text-white/25 mt-1">Expires {expiryLabel}</p>
                )}
            </div>
        </div>
    );
}

function EmptyPerks() {
    return (
        <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                <Gift size={28} className="text-white/20" />
            </div>
            <p className="text-white/50 text-sm">Keep visiting to unlock perks!</p>
        </div>
    );
}

function PerksLoadingSkeleton() {
    return (
        <div className="px-4 pt-6 space-y-4 animate-pulse">
            <div className="h-6 w-16 bg-white/10 rounded" />
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
        </div>
    );
}
