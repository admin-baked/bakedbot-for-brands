'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { CSSProperties } from 'react';
import { TABLET_MOODS, TabletMoodId } from '@/lib/checkin/loyalty-tablet-shared';
import { slideVariants, BUTTON_FOCUS_CLASS } from './shared';

interface MoodScreenProps {
    firstName: string;
    handleMoodSelect: (moodId: TabletMoodId) => Promise<void>;
    handleSubmit: () => void;
    loading: boolean;
    enteredViaQuickLookup: boolean;
    setStep: (step: 'phone') => void;
    resetToWelcome: () => void;
    mutedTextColor: string;
    faintTextColor: string;
    panelStyle: CSSProperties;
    primaryButtonStyle: CSSProperties;
}

export function MoodScreen({
    firstName,
    handleMoodSelect,
    handleSubmit,
    loading,
    enteredViaQuickLookup,
    setStep,
    resetToWelcome,
    mutedTextColor,
    faintTextColor,
    panelStyle,
    primaryButtonStyle
}: MoodScreenProps) {
    return (
        <motion.div
            key="mood"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }}
            className="relative z-10 mx-auto flex flex-col items-center gap-8 w-full max-w-2xl"
        >
            <div className="text-center">
                <h2 className="text-2xl sm:text-4xl font-black text-gray-900">
                    How are you feeling today{firstName ? `, ${firstName}` : ''}?
                </h2>
                <p className="mt-2 text-sm sm:text-lg" style={{ color: mutedTextColor }}>
                    Tap a mood for personalized picks, or just check in below.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                {TABLET_MOODS.map(mood => (
                    <button
                        key={mood.id}
                        onClick={() => { void handleMoodSelect(mood.id); }}
                        className={`flex items-center gap-2 rounded-[24px] border p-3 text-left transition-all hover:opacity-95 active:scale-[0.99] sm:gap-4 sm:p-5 ${BUTTON_FOCUS_CLASS}`}
                        style={panelStyle}
                    >
                        <span className="text-2xl sm:text-4xl shrink-0">{mood.emoji}</span>
                        <span className="text-sm sm:text-xl font-bold text-gray-900 leading-tight">{mood.label}</span>
                    </button>
                ))}
            </div>

            <button
                onClick={() => handleSubmit()}
                disabled={loading}
                className={`flex w-full items-center justify-center gap-3 rounded-[28px] py-5 text-xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40 ${BUTTON_FOCUS_CLASS}`}
                style={primaryButtonStyle}
            >
                <CheckCircle2 className="h-6 w-6" />
                {loading ? 'Checking in...' : 'Just Check Me In'}
            </button>
            <button onClick={() => enteredViaQuickLookup ? resetToWelcome() : setStep('phone')} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
        </motion.div>
    );
}
