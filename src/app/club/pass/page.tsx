'use client';

import { useState } from 'react';
import { useClub } from '../components/ClubProvider';
import { QRCode } from '@/components/ui/qr-code';
import { Barcode } from '@/components/ui/barcode';
import { Sun, Sparkles } from 'lucide-react';

export default function ClubPassPage() {
    const { member, membership, pass, pointsBalance, brandTheme, loading } = useClub();
    const [brightnessBoost, setBrightnessBoost] = useState(false);

    const storeName = brandTheme?.brandName ?? 'Your Dispensary';

    if (loading) {
        return <PassLoadingSkeleton />;
    }

    if (!member || !pass) {
        return (
            <div className="px-4 pt-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                    <Sparkles size={28} className="text-white/30" />
                </div>
                <h2 className="text-lg font-semibold">No Pass Found</h2>
                <p className="text-sm text-white/50">
                    Check in at the store to get your digital pass.
                </p>
            </div>
        );
    }

    const lastCheckIn = membership?.lastCheckInAt
        ? new Date(membership.lastCheckInAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })
        : null;

    return (
        <div className={`px-4 pt-6 space-y-5 transition-all ${brightnessBoost ? 'brightness-150' : ''}`}>
            {/* Pass card */}
            <div className="rounded-3xl overflow-hidden"
                 style={{
                     background: 'linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(15,15,26,1) 60%)',
                     border: '1px solid rgba(34,197,94,0.2)',
                 }}>
                {/* Header */}
                <div className="px-5 pt-5 pb-3">
                    <p className="text-sm text-white/50">{storeName} Club</p>
                    <h2 className="text-xl font-bold mt-0.5">{pass.displayName}</h2>
                    {membership?.tierId && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                            <Sparkles size={10} />
                            {membership.tierId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                    )}
                </div>

                {/* Points */}
                <div className="px-5 pb-3">
                    <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                        {pointsBalance.toLocaleString()} <span className="text-sm font-normal text-white/40">pts</span>
                    </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center py-4 bg-white rounded-t-2xl mx-3">
                    <QRCode
                        value={pass.qrValue}
                        size={200}
                        darkColor="#0f0f1a"
                        lightColor="#ffffff"
                    />
                </div>

                {/* Barcode */}
                <div className="bg-white mx-3 pb-4 px-4 rounded-b-2xl">
                    <Barcode
                        value={pass.barcodeValue}
                        height={50}
                        className="text-[#0f0f1a]"
                    />
                </div>

                {/* Member ID */}
                <div className="px-5 py-3 text-center">
                    <p className="text-[10px] text-white/30 font-mono tracking-widest">
                        {pass.memberCode}
                    </p>
                </div>
            </div>

            {/* Brightness toggle */}
            <button
                onClick={() => setBrightnessBoost(prev => !prev)}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-medium transition-colors"
                style={{
                    background: brightnessBoost ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: brightnessBoost ? '#22c55e' : 'rgba(255,255,255,0.6)',
                }}
            >
                <Sun size={16} />
                {brightnessBoost ? 'Brightness Boosted' : 'Increase Brightness'}
            </button>

            {/* Last check-in */}
            {lastCheckIn && (
                <p className="text-center text-xs text-white/30">
                    Last check-in: {lastCheckIn}
                </p>
            )}

            {/* Powered by */}
            <p className="text-center text-[10px] text-white/20 pt-2 pb-2">
                Powered by BakedBot
            </p>
        </div>
    );
}

function PassLoadingSkeleton() {
    return (
        <div className="px-4 pt-6 space-y-5 animate-pulse">
            <div className="h-[420px] rounded-3xl bg-white/5" />
            <div className="h-11 rounded-xl bg-white/5" />
        </div>
    );
}
