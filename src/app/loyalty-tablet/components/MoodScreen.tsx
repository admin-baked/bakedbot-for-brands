'use client';

import { motion } from 'framer-motion';
import { CSSProperties } from 'react';
import { TABLET_MOODS, TabletMoodId } from '@/lib/checkin/loyalty-tablet-shared';
import { slideVariants } from './shared';

interface MoodScreenProps {
    firstName: string;
    handleMoodSelect: (moodId: TabletMoodId) => Promise<void>;
    handleSubmit: () => void;
    loading: boolean;
    enteredViaQuickLookup: boolean;
    isReturningCustomer: boolean;
    setStep: (step: 'phone' | 'offer') => void;
    resetToWelcome: () => void;
    mutedTextColor: string;
    faintTextColor: string;
    panelStyle: CSSProperties;
}

export function MoodScreen({
    firstName,
    handleMoodSelect,
    handleSubmit,
    loading,
    enteredViaQuickLookup,
    isReturningCustomer,
    setStep,
    resetToWelcome,
    mutedTextColor,
    faintTextColor,
    panelStyle
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
                    Smokey will pull product cards from the live menu, and your budtender can refine them with voice.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                {TABLET_MOODS.map(mood => (
                    <button
                        key={mood.id}
                        onClick={() => { void handleMoodSelect(mood.id); }}
                        className="flex items-center gap-2 rounded-[24px] border p-3 text-left transition-all hover:opacity-95 active:scale-[0.99] sm:gap-4 sm:p-5"
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
                className="text-sm hover:opacity-70 disabled:opacity-40"
                style={{ color: faintTextColor }}
            >
                {loading ? 'Saving...' : 'Skip for now'}
            </button>
            <button onClick={() => enteredViaQuickLookup ? resetToWelcome() : setStep(isReturningCustomer ? 'phone' : 'offer')} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
        </motion.div>
    );
}
