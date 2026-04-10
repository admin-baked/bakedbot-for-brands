'use client';

import { motion } from 'framer-motion';
import { Store, UserPlus } from 'lucide-react';
import { CSSProperties } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { slideVariants, hexToRgba, AMBER, AMBER_DARK } from './shared';

interface ReturningCheckScreenProps {
    brandTheme: PublicBrandTheme;
    firstName: string;
    loading: boolean;
    mutedTextColor: string;
    panelStyle: CSSProperties;
    onYes: () => void;
    onNo: () => void;
}

export function ReturningCheckScreen({
    brandTheme,
    firstName,
    loading,
    mutedTextColor,
    panelStyle,
    onYes,
    onNo,
}: ReturningCheckScreenProps) {
    return (
        <motion.div
            key="returning_check"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-6 text-center"
        >
            <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
                Hey {firstName}! 👋
            </h1>
            <p className="text-lg" style={{ color: mutedTextColor }}>
                Have you shopped with us before?
            </p>

            <div className="flex w-full flex-col gap-4 mt-2">
                <button
                    onClick={onYes}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 rounded-2xl border-2 px-8 py-5 text-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    style={{
                        background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DARK} 100%)`,
                        borderColor: AMBER,
                        color: '#ffffff',
                        boxShadow: `0 8px 24px ${hexToRgba(AMBER, 0.28)}`,
                    }}
                >
                    <Store className="h-6 w-6" />
                    {loading ? 'Looking you up...' : 'Yes, I have!'}
                </button>

                <button
                    onClick={onNo}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 rounded-2xl border-2 px-8 py-5 text-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    style={{
                        ...panelStyle,
                        borderColor: hexToRgba(brandTheme.colors.primary, 0.3),
                        color: brandTheme.colors.primary,
                    }}
                >
                    <UserPlus className="h-6 w-6" />
                    First time here
                </button>
            </div>

            <p className="text-sm mt-2" style={{ color: mutedTextColor }}>
                This helps us find your purchase history and personalize your experience
            </p>
        </motion.div>
    );
}
