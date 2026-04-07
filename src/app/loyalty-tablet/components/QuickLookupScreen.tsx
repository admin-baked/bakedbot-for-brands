'use client';

import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { CSSProperties } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { QuickLookupResult } from '@/server/actions/loyalty-tablet';
import { slideVariants, AMBER, INPUT_CLASS } from './shared';
import { hexToRgba } from '@/lib/utils';

interface QuickLookupScreenProps {
    brandTheme: PublicBrandTheme;
    quickDigits: string;
    setQuickDigits: (digits: string) => void;
    quickLookupLoading: boolean;
    quickMatches: QuickLookupResult['matches'];
    handleQuickMatchSelect: (match: QuickLookupResult['matches'][0]) => void;
    handleQuickLookup: (digits?: string) => Promise<void>;
    resetIdleTimer: () => void;
    error: string;
    setError: (error: string) => void;
    resetToWelcome: () => void;
    mutedTextColor: string;
    faintTextColor: string;
    panelStyle: CSSProperties;
    inputStyle: CSSProperties;
    primaryButtonStyle: CSSProperties;
}

export function QuickLookupScreen({
    brandTheme,
    quickDigits,
    setQuickDigits,
    quickLookupLoading,
    quickMatches,
    handleQuickMatchSelect,
    handleQuickLookup,
    resetIdleTimer,
    error,
    setError,
    resetToWelcome,
    mutedTextColor,
    faintTextColor,
    panelStyle,
    inputStyle,
    primaryButtonStyle
}: QuickLookupScreenProps) {
    return (
        <motion.div
            key="quick_lookup"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }}
            className="relative z-10 mx-auto flex flex-col items-center gap-8 w-full max-w-lg"
        >
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: hexToRgba(AMBER, 0.1) }}>
                    ⚡
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-gray-900">Quick Check-In</h2>
                <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>
                    Enter the last 4 digits of your phone number
                </p>
            </div>

            {quickMatches.length > 1 ? (
                <div className="w-full space-y-3">
                    <p className="text-center text-sm font-medium" style={{ color: mutedTextColor }}>Which one are you?</p>
                    {quickMatches.map(m => (
                        <button
                            key={m.customerId}
                            onClick={() => handleQuickMatchSelect(m)}
                            className="w-full flex items-center justify-between rounded-[24px] border p-5 transition-all hover:opacity-95"
                            style={panelStyle}
                        >
                            <span className="text-xl font-bold text-gray-900">{m.firstName}</span>
                            <span className="text-sm font-medium" style={{ color: brandTheme.colors.primary }}>···{m.phoneLast4}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="w-full space-y-4">
                    <input
                        type="tel"
                        placeholder="_ _ _ _"
                        value={quickDigits}
                        onChange={e => {
                            const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setQuickDigits(d);
                            resetIdleTimer();
                            if (d.length === 4) void handleQuickLookup(d);
                        }}
                        className={`${INPUT_CLASS} text-center tracking-[0.5em] text-3xl`}
                        style={inputStyle}
                        inputMode="numeric"
                        maxLength={4}
                        autoFocus
                    />
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <button
                        onClick={() => { void handleQuickLookup(); }}
                        disabled={quickDigits.length !== 4 || quickLookupLoading}
                        className="flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                        style={primaryButtonStyle}
                    >
                        {quickLookupLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <>Find Me <ArrowRight className="h-7 w-7" /></>
                        )}
                    </button>
                </div>
            )}
            <button onClick={() => { setError(''); resetToWelcome(); }} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
        </motion.div>
    );
}
