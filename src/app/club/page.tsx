'use client';

import { useClub } from './components/ClubProvider';
import { CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function ClubHomePage() {
    const { member, membership, pointsBalance, rewards, brandTheme, loading } = useClub();
    const searchParams = useSearchParams();
    const qs = searchParams.toString();
    const suffix = qs ? `?${qs}` : '';

    const storeName = brandTheme?.brandName ?? 'Your Dispensary';
    const firstAvailableReward = rewards.find(r => r.status === 'available');

    if (loading) {
        return <HomeLoadingSkeleton />;
    }

    return (
        <div className="px-4 pt-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                {brandTheme?.logoUrl ? (
                    <Image
                        src={brandTheme.logoUrl}
                        alt={storeName}
                        width={48}
                        height={48}
                        className="rounded-xl object-contain bg-white/10 p-1"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Sparkles size={24} className="text-emerald-400" />
                    </div>
                )}
                <div>
                    <h1 className="text-lg font-bold">{storeName} Rewards</h1>
                    {member ? (
                        <p className="text-sm text-white/60">
                            Welcome back, {member.firstName}
                        </p>
                    ) : (
                        <p className="text-sm text-white/60">Member Portal</p>
                    )}
                </div>
            </div>

            {/* Tier Badge */}
            {membership && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <Sparkles size={12} />
                    {membership.tierId ? membership.tierId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Member'}
                </div>
            )}

            {/* Points Balance */}
            <div className="rounded-2xl p-6 text-center"
                 style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white/50 text-sm mb-1">Points Balance</p>
                <p className="text-5xl font-bold tabular-nums tracking-tight text-emerald-400">
                    {pointsBalance.toLocaleString()}
                </p>
                {membership && (
                    <p className="text-white/40 text-xs mt-2">
                        {membership.stats.visitCount} visit{membership.stats.visitCount !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Featured Perk */}
            {firstAvailableReward && (
                <Link href={`/club/perks${suffix}`}
                      className="block rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-400 font-semibold mb-0.5">Ready to Redeem</p>
                            <p className="font-medium">{firstAvailableReward.title}</p>
                            {firstAvailableReward.description && (
                                <p className="text-sm text-white/50 mt-0.5">{firstAvailableReward.description}</p>
                            )}
                        </div>
                        <ArrowRight size={18} className="text-white/30 flex-shrink-0" />
                    </div>
                </Link>
            )}

            {/* CTAs */}
            <div className="space-y-3">
                <Link href={`/club/pass${suffix}`}
                      className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-colors">
                    <CreditCard size={18} />
                    Open Pass
                </Link>
            </div>

            {/* Powered by */}
            <p className="text-center text-[10px] text-white/20 pt-4 pb-2">
                Powered by BakedBot
            </p>
        </div>
    );
}

function HomeLoadingSkeleton() {
    return (
        <div className="px-4 pt-6 space-y-6 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10" />
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-white/10 rounded" />
                    <div className="h-3 w-24 bg-white/5 rounded" />
                </div>
            </div>
            <div className="h-32 rounded-2xl bg-white/5" />
            <div className="h-16 rounded-2xl bg-white/5" />
            <div className="h-12 rounded-xl bg-white/5" />
        </div>
    );
}
