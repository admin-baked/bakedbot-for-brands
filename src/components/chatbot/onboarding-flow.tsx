
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type OnboardingStep = 'mood' | 'experience' | 'social' | 'completed';

type OnboardingAnswers = {
    mood: string | null;
    experience: string | null;
    social: string | null;
};

const moods = [ "Relax / Chill", "Sleep / Calm", "Creative Flow", "Social / Talkative", "Pain Relief", "Focus / Productivity", ];

const OnboardingFlow = ({ onComplete }: { onComplete: (answers: OnboardingAnswers) => void }) => {
    const [step, setStep] = useState<OnboardingStep>('mood');
    const [answers, setAnswers] = useState<OnboardingAnswers>({ mood: null, experience: null, social: null });

    const selectAnswer = (type: keyof OnboardingAnswers, value: string) => {
        const newAnswers = { ...answers, [type]: value };
        setAnswers(newAnswers);

        if (type === 'mood') {
            setStep('experience');
        } else if (type === 'experience') {
            setStep('social');
        } else if (type === 'social') {
            setStep('completed');
            onComplete(newAnswers);
        }
    };

    return (
        <div className="p-4 text-center h-full flex flex-col justify-center animate-in fade-in-50">
            {step === 'mood' && (
                <>
                    <h2 className="text-lg font-semibold">How would you like to feel?</h2>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">Select an effect to get started.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {moods.map(mood => (
                            <Button key={mood} variant="outline" onClick={() => selectAnswer('mood', mood)}>{mood}</Button>
                        ))}
                    </div>
                </>
            )}
            {step === 'experience' && (
                 <>
                    <h2 className="text-lg font-semibold">Nice choice! 🌈</h2>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">How experienced are you with cannabis?</p>
                    <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" onClick={() => selectAnswer('experience', 'Beginner')}>Beginner</Button>
                        <Button variant="outline" onClick={() => selectAnswer('experience', 'Occasional')}>Occasional</Button>
                        <Button variant="outline" onClick={() => selectAnswer('experience', 'Regular')}>Regular</Button>
                    </div>
                </>
            )}
             {step === 'social' && (
                 <>
                    <h2 className="text-lg font-semibold">One last thing! 👯‍&#9792;</h2>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">Are you planning to enjoy this solo or with others?</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => selectAnswer('social', 'Solo')}>Solo</Button>
                        <Button variant="outline" onClick={() => selectAnswer('social', 'With Friends')}>With Friends</Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default OnboardingFlow;
