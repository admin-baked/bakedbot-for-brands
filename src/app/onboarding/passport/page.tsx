
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { DesiredEffect, ConsumptionMethod, ExperienceLevel } from '@/types/preference-passport';
import { useRouter } from 'next/navigation';
import { createClient } from '@/firebase/client'; // Utilizing client-side firebase for the wizard? Or server action? 
// Let's use a server action for submission to be consistent with Next.js 14 patterns, but client state for wizard.

// Steps
const STEPS = ['Experience', 'Effects', 'Methods', 'Review'];

export default function PassportOnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [data, setData] = useState({
        experienceLevel: 'novice' as ExperienceLevel,
        desiredEffects: [] as DesiredEffect[],
        preferredMethods: [] as ConsumptionMethod[]
    });

    const progress = ((step + 1) / STEPS.length) * 100;

    const handleNext = async () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            // Submit
            await submitPassport();
        }
    };

    const submitPassport = async () => {
        try {
            // Import dynamically or use standard import if top-level works
            const { savePassportAction } = await import('@/server/actions/passport');
            await savePassportAction(data);
            router.push('/dashboard');
        } catch (error) {
            console.error("Failed to save passport", error);
        }
    };

    const toggleSelection = <T extends string>(field: keyof typeof data, value: T) => {
        setData(prev => {
            const current = prev[field] as T[];
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(i => i !== value) };
            } else {
                return { ...prev, [field]: [...current, value] };
            }
        });
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg shadow-xl border-slate-200">
                <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                            Step {step + 1} of {STEPS.length}
                        </Badge>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Preference Passport</span>
                    </div>
                    <Progress value={progress} className="h-1 mb-4" />

                    <CardTitle className="text-2xl">
                        {step === 0 && "What's your experience level?"}
                        {step === 1 && "What effects represent you?"}
                        {step === 2 && "How do you prefer to consume?"}
                        {step === 3 && "All set! Ready to bake?"}
                    </CardTitle>
                    <CardDescription>
                        {step === 0 && "We'll tailor recommendations to your comfort zone."}
                        {step === 1 && "Select the vibes you're looking for (choose up to 3)."}
                        {step === 2 && "We'll filter out products you don't use."}
                        {step === 3 && "We've built your unique taste profile."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 min-h-[300px]">
                    {/* Step 0: Experience */}
                    {step === 0 && (
                        <div className="grid gap-4">
                            {(['novice', 'intermediate', 'expert'] as ExperienceLevel[]).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setData({ ...data, experienceLevel: level })}
                                    className={`p-4 rounded-lg border-2 text-left transition-all ${data.experienceLevel === level
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <div className="font-semibold capitalize text-lg mb-1">{level}</div>
                                    <div className="text-sm text-slate-500">
                                        {level === 'novice' && "I'm new to cannabis or creating a fresh start."}
                                        {level === 'intermediate' && "I know what I like but I'm open to exploring."}
                                        {level === 'expert' && "I'm a connoisseur looking for specific profiles."}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 1: Effects */}
                    {step === 1 && (
                        <div className="flex flex-wrap gap-3">
                            {(['sleep', 'pain_relief', 'anxiety_relief', 'focus', 'creative', 'social', 'energy'] as DesiredEffect[]).map((effect) => (
                                <button
                                    key={effect}
                                    onClick={() => toggleSelection('desiredEffects', effect)}
                                    className={`px-4 py-2 rounded-full border transition-all text-sm font-medium ${data.desiredEffects.includes(effect)
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {effect.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Methods */}
                    {step === 2 && (
                        <div className="grid grid-cols-2 gap-3">
                            {(['flower', 'preroll', 'vape', 'edible', 'concentrate', 'tincture'] as ConsumptionMethod[]).map((method) => (
                                <button
                                    key={method}
                                    onClick={() => toggleSelection('preferredMethods', method)}
                                    className={`p-3 rounded-lg border text-center transition-all ${data.preferredMethods.includes(method)
                                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="capitalize">{method}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div className="bg-slate-100 p-6 rounded-lg space-y-4">
                            <div className="flex items-center gap-2 text-primary font-semibold border-b border-white pb-2">
                                <Sparkles className="w-5 h-5" />
                                Your Passport
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block text-xs uppercase mb-1">Level</span>
                                    <span className="font-medium capitalize">{data.experienceLevel}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs uppercase mb-1">Vibes</span>
                                    <div className="flex flex-wrap gap-1">
                                        {data.desiredEffects.length > 0 ? (
                                            data.desiredEffects.map(e => (
                                                <Badge key={e} variant="secondary" className="text-xs">{e.replace('_', ' ')}</Badge>
                                            ))
                                        ) : <span className="text-slate-400">Any</span>}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-500 block text-xs uppercase mb-1">Methods</span>
                                    <div className="flex flex-wrap gap-1">
                                        {data.preferredMethods.length > 0 ? (
                                            data.preferredMethods.map(m => (
                                                <Badge key={m} variant="outline" className="text-xs bg-white">{m}</Badge>
                                            ))
                                        ) : <span className="text-slate-400">Open to suggestions</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between border-t border-slate-100 pt-6">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(prev => Math.max(0, prev - 1))}
                        disabled={step === 0}
                    >
                        Back
                    </Button>
                    <Button onClick={handleNext} className="gap-2">
                        {step === STEPS.length - 1 ? 'Create Passport' : 'Next'}
                        {step !== STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}
                        {step === STEPS.length - 1 && <Check className="w-4 h-4" />}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
