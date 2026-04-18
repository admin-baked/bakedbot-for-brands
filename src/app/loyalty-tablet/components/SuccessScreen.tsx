'use client';

import { motion } from 'framer-motion';
import { Star, ShoppingCart, Smartphone } from 'lucide-react';
import { CSSProperties } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { QRCode } from '@/components/ui/qr-code';
import { hexToRgba, AMBER, AMBER_DARK } from './shared';

interface SuccessScreenProps {
    brandTheme: PublicBrandTheme;
    firstName: string;
    result: { isNewLead: boolean; loyaltyPoints: number; queuePosition?: number; visitId?: string } | null;
    budtenderName: string;
    intent?: 'checkin' | 'pickup';
    cartCount: number;
    customerId: string | null;
    orgId: string;
    selectedMood: string | null;
    mutedTextColor: string;
    faintTextColor: string;
    panelStyle: CSSProperties;
    accentPanelStyle: CSSProperties;
}

export function SuccessScreen({
    brandTheme,
    firstName,
    result,
    budtenderName,
    intent,
    cartCount,
    customerId,
    orgId,
    selectedMood,
    mutedTextColor,
    faintTextColor,
    panelStyle,
    accentPanelStyle
}: SuccessScreenProps) {
    return (
        <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, type: 'spring' }}
            className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-8 text-center"
        >
            {/* Smokey farewell mascot */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 180 }}
                className="relative flex items-center justify-center"
            >
                <div className="absolute h-44 w-44 rounded-full opacity-10" style={{ backgroundColor: brandTheme.colors.primary }} />
                <img
                    src="/assets/agents/smokey-main.png"
                    alt="Smokey"
                    className="relative h-32 w-32 object-contain drop-shadow-xl"
                />
            </motion.div>

            <div>
                <h1 className="mb-3 text-3xl font-black text-gray-900 sm:text-5xl">
                    {intent === 'pickup'
                        ? firstName ? `You're checked in for pickup, ${firstName}!` : 'You\'re checked in for pickup!'
                        : firstName
                            ? `You're checked out, ${firstName}!`
                            : result?.isNewLead
                                ? 'You\'re all checked in!'
                                : 'Welcome back!'}
                </h1>
                <p className="text-base sm:text-xl" style={{ color: mutedTextColor }}>
                    {intent === 'pickup'
                        ? 'A budtender will grab your order shortly — head to the counter!'
                        : budtenderName
                            ? `${budtenderName} has your order ready — head to the counter!`
                            : cartCount > 0
                                ? 'Show this screen at the counter to complete your order.'
                                : result?.isNewLead
                                    ? 'Your follow-ups are set if you opted in.'
                                    : 'Your loyalty balance is ready.'}
                </p>
            </div>

            {result && result.loyaltyPoints > 0 && (
                <div className="flex items-center gap-4 rounded-[28px] border px-8 py-5" style={accentPanelStyle}>
                    <Star className="h-10 w-10" style={{ color: AMBER }} />
                    <div className="text-left">
                        <div className="text-3xl font-black text-gray-900">{result.loyaltyPoints} pts</div>
                        <div className="text-sm" style={{ color: mutedTextColor }}>Your loyalty balance</div>
                    </div>
                </div>
            )}

            {result && result.queuePosition !== undefined && result.queuePosition > 0 && (
                <div className="flex items-center gap-4 rounded-[28px] border px-8 py-5" style={panelStyle}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black" style={{ backgroundColor: hexToRgba(AMBER, 0.12), color: AMBER_DARK }}>
                        {result.queuePosition}
                    </div>
                    <div className="text-left">
                        <div className="text-lg font-bold text-gray-900">
                            {result.queuePosition === 1 ? '1 customer ahead' : `${result.queuePosition} customers ahead`}
                        </div>
                        <div className="text-sm" style={{ color: mutedTextColor }}>A budtender will be right with you</div>
                    </div>
                </div>
            )}

            {cartCount > 0 && (
                <div className="flex flex-col items-center gap-2 rounded-[28px] border px-8 py-5 text-center" style={{ ...panelStyle, borderColor: 'rgba(16,185,129,0.35)', backgroundColor: 'rgba(16,185,129,0.06)' }}>
                    <ShoppingCart className="h-9 w-9" style={{ color: brandTheme.colors.primary }} />
                    <p className="text-lg font-black text-gray-900">
                        {cartCount} item{cartCount !== 1 ? 's' : ''} queued for your budtender
                    </p>
                    <p className="text-sm" style={{ color: mutedTextColor }}>
                        Your picks are ready — show this screen at the counter to check out.
                    </p>
                </div>
            )}

            {/* Internal review prompt */}
            {customerId && (
                <div className="w-full max-w-sm rounded-[24px] border p-5" style={panelStyle}>
                    <p className="text-sm font-semibold mb-3" style={{ color: brandTheme.colors.primary }}>
                        How was your visit today?
                    </p>
                    <div className="flex justify-center gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                onClick={async () => {
                                    try {
                                        await fetch('/api/internal-review', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                orgId,
                                                customerId,
                                                visitId: result?.queuePosition ? `visit_${Date.now()}` : undefined,
                                                rating: star,
                                                mood: selectedMood ?? undefined,
                                            }),
                                        });
                                    } catch { /* ignore */ }
                                }}
                                className="transition-transform hover:scale-110 active:scale-95"
                            >
                                <Star
                                    className="h-8 w-8 transition-colors"
                                    style={{ color: star <= 3 ? '#ef4444' : star === 4 ? '#f59e0b' : '#22c55e' }}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="text-xs" style={{ color: faintTextColor }}>Tap to rate (helps us improve recommendations)</p>
                </div>
            )}

            {/* QR code for detailed review on phone */}
            {customerId && result?.visitId && (
                <div className="w-full max-w-sm rounded-[24px] border p-5 flex flex-col items-center gap-3" style={panelStyle}>
                    <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" style={{ color: brandTheme.colors.primary }} />
                        <p className="text-sm font-semibold" style={{ color: brandTheme.colors.primary }}>
                            Leave a detailed review
                        </p>
                    </div>
                    <QRCode
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/review?orgId=${orgId}&visitId=${result.visitId}`}
                        size={120}
                        darkColor={brandTheme.colors.primary}
                    />
                    <p className="text-xs text-center" style={{ color: faintTextColor }}>
                        Scan with your phone to tell us more about your experience
                    </p>
                </div>
            )}

            <p className="text-sm" style={{ color: faintTextColor }}>This screen will reset in a few seconds...</p>
        </motion.div>
    );
}
