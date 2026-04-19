'use client';

import { motion } from 'framer-motion';
import { Phone, CheckCircle2, ArrowRight } from 'lucide-react';
import { CSSProperties } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { slideVariants, INPUT_CLASS, BUTTON_FOCUS_CLASS } from './shared';

interface PhoneScreenProps {
    brandTheme: PublicBrandTheme;
    isReturningCustomer: boolean;
    firstName: string;
    setFirstName: (name: string) => void;
    phone: string;
    setPhone: (phone: string) => void;
    smsConsent: boolean;
    setSmsConsent: (consent: boolean) => void;
    handlePhoneSubmit: () => void;
    resetIdleTimer: () => void;
    error: string;
    setError: (error: string) => void;
    resetToWelcome: () => void;
    mutedTextColor: string;
    faintTextColor: string;
    inputStyle: CSSProperties;
    panelStyle: CSSProperties;
    accentPanelStyle: CSSProperties;
    primaryButtonStyle: CSSProperties;
    formatPhone: (value: string) => string;
}

export function PhoneScreen({
    brandTheme,
    isReturningCustomer,
    firstName,
    setFirstName,
    phone,
    setPhone,
    smsConsent,
    setSmsConsent,
    handlePhoneSubmit,
    resetIdleTimer,
    error,
    setError,
    resetToWelcome,
    mutedTextColor,
    faintTextColor,
    inputStyle,
    panelStyle,
    accentPanelStyle,
    primaryButtonStyle,
    formatPhone
}: PhoneScreenProps) {
    return (
        <motion.div
            key="phone"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }}
            className="relative z-10 mx-auto flex flex-col items-center gap-8 w-full max-w-lg"
        >
            <div className="text-center">
                <Phone className="mx-auto mb-4 h-10 w-10 sm:h-14 sm:w-14" style={{ color: brandTheme.colors.primary }} />
                {isReturningCustomer && firstName ? (
                    <>
                        <h2 className="text-2xl sm:text-4xl font-black text-gray-900">Welcome back, {firstName}! 👋</h2>
                        <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>We found your account — tap Continue to jump straight to picks</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl sm:text-4xl font-black text-gray-900">Welcome! What&apos;s your name?</h2>
                        <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>Your phone number is your loyalty ID</p>
                    </>
                )}
            </div>
            <div className="w-full space-y-4">
                <label htmlFor="checkin-first-name" className="sr-only">First name</label>
                <input
                    id="checkin-first-name"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); resetIdleTimer(); }}
                    className={INPUT_CLASS}
                    style={inputStyle}
                    autoComplete="given-name"
                />
                <label htmlFor="checkin-phone" className="sr-only">Phone number</label>
                <input
                    id="checkin-phone"
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={e => { setPhone(formatPhone(e.target.value)); resetIdleTimer(); }}
                    className={INPUT_CLASS}
                    style={inputStyle}
                    inputMode="tel"
                    autoComplete="tel"
                />
                <div className="space-y-3">
                    {[
                        { checked: smsConsent, onChange: setSmsConsent, label: 'Yes, text me deals & updates' },
                    ].map(item => (
                        <button
                            key={item.label}
                            onClick={() => { item.onChange(!item.checked); resetIdleTimer(); }}
                            className="flex w-full items-center gap-4 rounded-[24px] border-2 p-4 transition-all"
                            style={item.checked ? accentPanelStyle : panelStyle}
                        >
                            <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                                style={{
                                    borderColor: item.checked ? brandTheme.colors.primary : '#d1d5db',
                                    backgroundColor: item.checked ? brandTheme.colors.primary : 'transparent',
                                }}
                            >
                                {item.checked && <CheckCircle2 className="h-5 w-5 text-white" />}
                            </div>
                            <span className="text-lg text-gray-900 text-left">{item.label}</span>
                        </button>
                    ))}
                </div>
                <p className="px-4 text-center text-xs" style={{ color: faintTextColor }}>
                    Msg &amp; data rates may apply. Opt out anytime.
                </p>
            </div>
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <button
                onClick={handlePhoneSubmit}
                disabled={!firstName.trim() || phone.replace(/\D/g, '').length < 10}
                className={`flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40 ${BUTTON_FOCUS_CLASS}`}
                style={primaryButtonStyle}
            >
                {isReturningCustomer ? 'Find My Picks' : 'Continue'} <ArrowRight className="h-7 w-7" />
            </button>
            <button onClick={() => { setError(''); resetToWelcome(); }} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
        </motion.div>
    );
}
