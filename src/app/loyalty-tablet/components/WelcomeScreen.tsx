'use client';

import { motion } from 'framer-motion';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { slideVariants } from './shared';
import { CSSProperties } from 'react';

interface WelcomeScreenProps {
    brandTheme: PublicBrandTheme;
    brandName: string;
    mutedTextColor: string;
    faintTextColor: string;
    primaryButtonStyle: CSSProperties;
    onCheckIn: () => void;
    onJoinClub: () => void;
    onFindPass: () => void;
    onAskSmokey: () => void;
}

export function WelcomeScreen({
    brandTheme,
    brandName,
    mutedTextColor,
    faintTextColor,
    primaryButtonStyle,
    onCheckIn,
    onJoinClub,
    onFindPass,
    onAskSmokey
}: WelcomeScreenProps) {
    return (
        <motion.div
            key="welcome"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }}
            className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-8 text-center"
        >
            {brandTheme.logoUrl ? (
                <div className="rounded-3xl bg-white p-4 shadow-md border border-gray-100">
                    <img
                        src={brandTheme.logoUrl}
                        alt={`${brandName} logo`}
                        className="h-24 w-auto max-w-[260px] object-contain sm:h-32"
                    />
                </div>
            ) : (
                <div className="text-6xl sm:text-8xl">🍃</div>
            )}
            <div>
                <h1 className="mb-3 text-3xl font-black text-gray-900 sm:text-5xl">{brandName} Club</h1>
                <p className="text-base sm:text-xl" style={{ color: mutedTextColor }}>
                    Join the elite circle. Earn points, get Smokey's pro picks, and unlock exclusive perks every visit.
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
                <button
                    onClick={onCheckIn}
                    className="flex flex-col items-center justify-center gap-3 rounded-[32px] p-8 transition-all hover:opacity-95 active:scale-[0.98] shadow-xl border-b-4"
                    style={primaryButtonStyle}
                >
                    <span className="text-4xl">🚀</span>
                    <span className="text-xl font-black uppercase tracking-tight">Check In</span>
                </button>

                <button
                    onClick={onJoinClub}
                    className="flex flex-col items-center justify-center gap-3 rounded-[32px] p-8 transition-all hover:opacity-95 active:scale-[0.98] bg-white border-2 border-gray-100 shadow-lg border-b-4 border-b-gray-200"
                >
                    <span className="text-4xl">💎</span>
                    <span className="text-xl font-black uppercase tracking-tight text-gray-900">Join Club</span>
                </button>

                <button
                    onClick={onFindPass}
                    className="flex flex-col items-center justify-center gap-3 rounded-[32px] p-8 transition-all hover:opacity-95 active:scale-[0.98] bg-white border-2 border-gray-100 shadow-lg border-b-4 border-b-gray-200"
                >
                    <span className="text-4xl">🆔</span>
                    <span className="text-xl font-black uppercase tracking-tight text-gray-900">Find My Pass</span>
                </button>

                <button
                    onClick={onAskSmokey}
                    className="flex flex-col items-center justify-center gap-3 rounded-[32px] p-8 transition-all hover:opacity-95 active:scale-[0.98] bg-white border-2 border-gray-100 shadow-lg border-b-4 border-b-gray-200"
                >
                    <span className="text-4xl">💨</span>
                    <span className="text-xl font-black uppercase tracking-tight text-gray-900">Ask Smokey</span>
                </button>
            </div>

            <p className="text-sm font-bold animate-pulse" style={{ color: faintTextColor }}>Tap any action to begin</p>
        </motion.div>
    );
}
