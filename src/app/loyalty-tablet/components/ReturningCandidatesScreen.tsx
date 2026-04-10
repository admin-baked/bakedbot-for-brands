'use client';

import { motion } from 'framer-motion';
import { UserCheck, XCircle } from 'lucide-react';
import { CSSProperties } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import type { AlleavesCandidateMatch } from '@/server/actions/loyalty-tablet';
import { slideVariants, hexToRgba, AMBER } from './shared';

interface ReturningCandidatesScreenProps {
    brandTheme: PublicBrandTheme;
    candidates: AlleavesCandidateMatch[];
    mutedTextColor: string;
    panelStyle: CSSProperties;
    onSelect: (candidate: AlleavesCandidateMatch) => void;
    onNone: () => void;
}

function formatSince(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return `Customer since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
        return '';
    }
}

export function ReturningCandidatesScreen({
    brandTheme,
    candidates,
    mutedTextColor,
    panelStyle,
    onSelect,
    onNone,
}: ReturningCandidatesScreenProps) {
    return (
        <motion.div
            key="returning_candidates"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-5 text-center"
        >
            <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
                Is one of these you?
            </h1>
            <p className="text-base" style={{ color: mutedTextColor }}>
                Tap your name to link your purchase history
            </p>

            <div className="flex w-full flex-col gap-3 mt-1">
                {candidates.map((c) => (
                    <button
                        key={c.customerId}
                        onClick={() => onSelect(c)}
                        className="flex items-center gap-4 rounded-2xl border-2 px-6 py-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                            ...panelStyle,
                            borderColor: hexToRgba(brandTheme.colors.primary, 0.2),
                        }}
                    >
                        <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                            style={{
                                backgroundColor: hexToRgba(AMBER, 0.12),
                                color: brandTheme.colors.primary,
                            }}
                        >
                            {c.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-lg font-bold text-gray-900 truncate">
                                {c.firstName} {c.lastInitial}
                            </div>
                            {c.customerSince && (
                                <div className="text-sm" style={{ color: mutedTextColor }}>
                                    {formatSince(c.customerSince)}
                                </div>
                            )}
                        </div>
                        <UserCheck className="h-5 w-5 shrink-0" style={{ color: brandTheme.colors.primary }} />
                    </button>
                ))}
            </div>

            <button
                onClick={onNone}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold transition-all hover:bg-gray-100 active:scale-[0.98]"
                style={{ color: mutedTextColor }}
            >
                <XCircle className="h-5 w-5" />
                None of these are me
            </button>
        </motion.div>
    );
}
