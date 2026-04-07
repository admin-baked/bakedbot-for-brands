'use client';

import { motion } from 'framer-motion';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CSSProperties } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { TabletOffer } from '@/server/actions/loyalty-tablet';
import { slideVariants, AMBER, AMBER_DARK, INPUT_CLASS } from './shared';

interface OfferScreenProps {
    brandTheme: PublicBrandTheme;
    firstName: string;
    tabletOffer: TabletOffer | null;
    offerLoading: boolean;
    offerClaimed: boolean;
    setOfferClaimed: (claimed: boolean) => void;
    birthday: string;
    setBirthday: (birthday: string) => void;
    visitPreferences: string[];
    toggleVisitPreference: (pref: string) => void;
    email: string;
    setEmail: (email: string) => void;
    emailConsent: boolean;
    setEmailConsent: (consent: boolean) => void;
    handleOfferSubmit: () => void;
    setStep: (step: 'phone' | 'mood') => void;
    resetIdleTimer: () => void;
    error: string;
    setError: (error: string) => void;
    mutedTextColor: string;
    faintTextColor: string;
    inputStyle: CSSProperties;
    panelStyle: CSSProperties;
    accentPanelStyle: CSSProperties;
    primaryButtonStyle: CSSProperties;
}

export function OfferScreen({
    brandTheme,
    firstName,
    tabletOffer,
    offerLoading,
    offerClaimed,
    setOfferClaimed,
    birthday,
    setBirthday,
    visitPreferences,
    toggleVisitPreference,
    email,
    setEmail,
    emailConsent,
    setEmailConsent,
    handleOfferSubmit,
    setStep,
    resetIdleTimer,
    error,
    setError,
    mutedTextColor,
    faintTextColor,
    inputStyle,
    panelStyle,
    accentPanelStyle,
    primaryButtonStyle
}: OfferScreenProps) {
    return (
        <motion.div
            key="offer"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }}
            className="relative z-10 mx-auto flex flex-col items-center gap-6 w-full max-w-lg"
        >
            {/* Deal card */}
            {offerLoading ? (
                <div className="w-full rounded-[28px] border p-6 flex items-center gap-4" style={accentPanelStyle}>
                    <Loader2 className="h-8 w-8 animate-spin shrink-0" style={{ color: AMBER }} />
                    <p className="text-lg font-bold text-gray-900">Finding a deal for you...</p>
                </div>
            ) : tabletOffer ? (
                <div
                    className="w-full rounded-[28px] border-2 p-5 transition-all cursor-pointer"
                    style={offerClaimed ? accentPanelStyle : { ...panelStyle, borderColor: AMBER }}
                    onClick={() => { setOfferClaimed(!offerClaimed); resetIdleTimer(); }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">🔥</span>
                        <span className="text-sm font-black uppercase tracking-widest" style={{ color: AMBER_DARK }}>
                            Today&apos;s Special — {firstName ? `Just for you, ${firstName}!` : 'Members Only'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {tabletOffer.imageUrl && (
                            <img
                                src={tabletOffer.imageUrl}
                                alt={tabletOffer.name}
                                className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-gray-100"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-black text-gray-900 leading-tight truncate">{tabletOffer.name}</p>
                            <p className="text-sm mt-0.5" style={{ color: mutedTextColor }}>{tabletOffer.reason}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-2xl font-black" style={{ color: brandTheme.colors.primary }}>${tabletOffer.dealPrice.toFixed(2)}</span>
                                <span className="text-base line-through" style={{ color: faintTextColor }}>${tabletOffer.originalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                        <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                            style={{
                                borderColor: offerClaimed ? brandTheme.colors.primary : AMBER,
                                backgroundColor: offerClaimed ? brandTheme.colors.primary : 'transparent',
                            }}
                        >
                            {offerClaimed && <CheckCircle2 className="h-5 w-5 text-white" />}
                        </div>
                    </div>
                    <p className="text-xs mt-3 text-center font-medium" style={{ color: offerClaimed ? brandTheme.colors.primary : faintTextColor }}>
                        {offerClaimed ? '✓ Deal claimed — ask your budtender!' : 'Tap to claim this deal'}
                    </p>
                </div>
            ) : null}

            {/* Birthday field */}
            <div className="w-full">
                <label className="block text-sm font-semibold mb-2" style={{ color: mutedTextColor }}>
                    🎂 Birthday (optional — earn a free reward!)
                </label>
                <input
                    type="text"
                    placeholder="MM/DD"
                    value={birthday}
                    onChange={e => {
                        let v = e.target.value.replace(/[^\d/]/g, '').slice(0, 5);
                        if (v.length === 2 && !v.includes('/')) v = v + '/';
                        setBirthday(v);
                        resetIdleTimer();
                    }}
                    className={INPUT_CLASS}
                    style={inputStyle}
                    inputMode="numeric"
                    maxLength={5}
                />
            </div>

            {/* Visit preference tags */}
            <div className="w-full">
                <p className="text-sm font-semibold mb-3" style={{ color: mutedTextColor }}>What describes you best? (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'first-timer', label: '🌱 First-Timer', sub: 'New to cannabis' },
                        { id: 'recreational', label: '😎 Recreational', sub: 'For fun & social' },
                        { id: 'medical', label: '💊 Medical', sub: 'For wellness' },
                        { id: 'regular', label: '⭐ Regular', sub: 'I know what I like' },
                    ].map(pref => (
                        <button
                            key={pref.id}
                            onClick={() => toggleVisitPreference(pref.id)}
                            className="flex flex-col items-start rounded-[20px] border-2 p-4 text-left transition-all hover:opacity-95"
                            style={visitPreferences.includes(pref.id) ? accentPanelStyle : panelStyle}
                        >
                            <span className="text-base font-bold text-gray-900">{pref.label}</span>
                            <span className="text-xs mt-0.5" style={{ color: mutedTextColor }}>{pref.sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Email opt-in */}
            <div className="w-full space-y-3">
                <input
                    type="email"
                    placeholder="Email for deals (optional)"
                    value={email}
                    onChange={e => { setEmail(e.target.value); resetIdleTimer(); }}
                    className={INPUT_CLASS}
                    style={inputStyle}
                    inputMode="email"
                    autoComplete="email"
                />
                {email.includes('@') && (
                    <button
                        onClick={() => { setEmailConsent(!emailConsent); resetIdleTimer(); }}
                        className="flex w-full items-center gap-4 rounded-[24px] border-2 p-4 transition-all"
                        style={emailConsent ? accentPanelStyle : panelStyle}
                    >
                        <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                            style={{
                                borderColor: emailConsent ? brandTheme.colors.primary : '#d1d5db',
                                backgroundColor: emailConsent ? brandTheme.colors.primary : 'transparent',
                            }}
                        >
                            {emailConsent && <CheckCircle2 className="h-5 w-5 text-white" />}
                        </div>
                        <span className="text-base text-gray-900 text-left">Yes, email me weekly deals &amp; bundles</span>
                    </button>
                )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
                onClick={handleOfferSubmit}
                className="flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                style={primaryButtonStyle}
            >
                {offerClaimed ? 'Claim & Find My Picks' : 'Continue'} <ArrowRight className="h-7 w-7" />
            </button>
            <button
                onClick={handleOfferSubmit}
                className="text-sm hover:opacity-70"
                style={{ color: faintTextColor }}
            >
                Skip for now →
            </button>
            <button onClick={() => { setError(''); setStep('phone'); }} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
        </motion.div>
    );
}
