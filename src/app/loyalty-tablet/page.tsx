'use client';

/**
 * Loyalty Tablet Page
 *
 * Full-screen touch-optimized flow for in-store check-in at Thrive Syracuse.
 * Designed for iPad at the dispensary counter.
 * Auto-resets after idle.
 *
 * Steps:
 *   welcome → phone → email → mood → recommendations → success
 *
 * Usage: Navigate to /loyalty-tablet?orgId=org_thrive_syracuse
 */

import { useState, useMemo, type SyntheticEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getTabletMoodById, SMOKEY_FALLBACK_IMAGE } from '@/lib/checkin/loyalty-tablet-shared';

import { WelcomeScreen } from './components/WelcomeScreen';
import { QuickLookupScreen } from './components/QuickLookupScreen';
import { PhoneScreen } from './components/PhoneScreen';
import { OfferScreen } from './components/OfferScreen';
import { MoodScreen } from './components/MoodScreen';
import { RecommendationsScreen } from './components/RecommendationsScreen';
import { SuccessScreen } from './components/SuccessScreen';

import { 
    createShellStyle, 
    createPanelStyle, 
    createPrimaryButtonStyle, 
    createSecondaryButtonStyle, 
    createInputStyle,
    hexToRgba
} from './components/shared';

import { useTabletFlow } from './hooks/use-tablet-flow';

export default function LoyaltyTabletPage() {
    const [orgId] = useState<string>(() => {
        if (typeof window === 'undefined') return 'org_thrive_syracuse';
        return new URLSearchParams(window.location.search).get('orgId') || 'org_thrive_syracuse';
    });

    const flow = useTabletFlow(orgId);

    // Style memoization
    const shellStyle = useMemo(() => createShellStyle(flow.brandTheme), [flow.brandTheme]);
    const panelStyle = useMemo(() => createPanelStyle(flow.brandTheme), [flow.brandTheme]);
    const accentPanelStyle = useMemo(() => createPanelStyle(flow.brandTheme, 'accent'), [flow.brandTheme]);
    const primaryButtonStyle = useMemo(() => createPrimaryButtonStyle(flow.brandTheme), [flow.brandTheme]);
    const secondaryButtonStyle = useMemo(() => createSecondaryButtonStyle(flow.brandTheme), [flow.brandTheme]);
    const inputStyle = useMemo(() => createInputStyle(flow.brandTheme), [flow.brandTheme]);

    const brandName = flow.brandTheme.organizationName || 'Thrive Syracuse';
    const mutedTextColor = flow.brandTheme.brandMood === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    const faintTextColor = flow.brandTheme.brandMood === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';

    const cartCount = flow.cart.length + (flow.bundleAdded ? 1 : 0);
    const selectedMoodDef = flow.selectedMood ? getTabletMoodById(flow.selectedMood) : null;

    const handleProductImageError = (event: SyntheticEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        if (image.dataset.fallbackApplied === 'true') return;
        image.dataset.fallbackApplied = 'true';
        image.src = SMOKEY_FALLBACK_IMAGE;
    };

    function formatPhone(value: string) {
        const d = value.replace(/\D/g, '');
        if (d.length <= 3) return d;
        if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
        return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
    }

    return (
        <div 
            className="flex min-h-screen w-full flex-col p-4 sm:p-8 overflow-x-hidden font-sans select-none"
            style={shellStyle}
        >
            <AnimatePresence mode="wait">

                {/* ── WELCOME ── */}
                {flow.step === 'welcome' && (
                    <WelcomeScreen
                        brandTheme={flow.brandTheme}
                        brandName={brandName}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        primaryButtonStyle={primaryButtonStyle}
                        onCheckIn={() => flow.setStep('phone')}
                        onJoinClub={() => flow.setStep('phone')}
                        onFindPass={() => { flow.setQuickDigits(''); flow.setQuickMatches([]); flow.setStep('quick_lookup'); }}
                        onAskSmokey={() => flow.setStep('mood')}
                    />
                )}

                {/* ── QUICK LOOKUP ── */}
                {flow.step === 'quick_lookup' && (
                    <QuickLookupScreen
                        brandTheme={flow.brandTheme}
                        quickDigits={flow.quickDigits}
                        setQuickDigits={flow.setQuickDigits}
                        quickLookupLoading={flow.quickLookupLoading}
                        quickMatches={flow.quickMatches}
                        handleQuickMatchSelect={flow.handleQuickMatchSelect}
                        handleQuickLookup={flow.handleQuickLookup}
                        resetIdleTimer={flow.resetIdleTimer}
                        error={flow.error}
                        setError={flow.setError}
                        resetToWelcome={flow.resetToWelcome}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        panelStyle={panelStyle}
                        inputStyle={inputStyle}
                        primaryButtonStyle={primaryButtonStyle}
                    />
                )}

                {/* ── PHONE ── */}
                {flow.step === 'phone' && (
                    <PhoneScreen
                        brandTheme={flow.brandTheme}
                        isReturningCustomer={flow.isReturningCustomer}
                        firstName={flow.firstName}
                        setFirstName={flow.setFirstName}
                        phone={flow.phone}
                        setPhone={flow.setPhone}
                        smsConsent={flow.smsConsent}
                        setSmsConsent={flow.setSmsConsent}
                        handlePhoneSubmit={flow.handlePhoneSubmit}
                        resetIdleTimer={flow.resetIdleTimer}
                        error={flow.error}
                        setError={flow.setError}
                        resetToWelcome={flow.resetToWelcome}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        inputStyle={inputStyle}
                        panelStyle={panelStyle}
                        accentPanelStyle={accentPanelStyle}
                        primaryButtonStyle={primaryButtonStyle}
                        formatPhone={formatPhone}
                    />
                )}

                {/* ── OFFER ── */}
                {flow.step === 'offer' && (
                    <OfferScreen
                        brandTheme={flow.brandTheme}
                        firstName={flow.firstName}
                        tabletOffer={flow.tabletOffer}
                        offerLoading={flow.offerLoading}
                        offerClaimed={flow.offerClaimed}
                        setOfferClaimed={flow.setOfferClaimed}
                        birthday={flow.birthday}
                        setBirthday={flow.setBirthday}
                        visitPreferences={flow.visitPreferences}
                        toggleVisitPreference={flow.toggleVisitPreference}
                        email={flow.email}
                        setEmail={flow.setEmail}
                        emailConsent={flow.emailConsent}
                        setEmailConsent={flow.setEmailConsent}
                        handleOfferSubmit={flow.handleOfferSubmit}
                        setStep={(s: any) => flow.setStep(s)}
                        resetIdleTimer={flow.resetIdleTimer}
                        error={flow.error}
                        setError={flow.setError}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        inputStyle={inputStyle}
                        panelStyle={panelStyle}
                        accentPanelStyle={accentPanelStyle}
                        primaryButtonStyle={primaryButtonStyle}
                    />
                )}

                {/* ── MOOD ── */}
                {flow.step === 'mood' && (
                    <MoodScreen
                        firstName={flow.firstName}
                        handleMoodSelect={flow.handleMoodSelect}
                        handleSubmit={flow.handleSubmit}
                        loading={flow.loading}
                        enteredViaQuickLookup={flow.enteredViaQuickLookup}
                        isReturningCustomer={flow.isReturningCustomer}
                        setStep={(s: any) => flow.setStep(s)}
                        resetToWelcome={flow.resetToWelcome}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        panelStyle={panelStyle}
                    />
                )}

                {/* ── RECOMMENDATIONS ── */}
                {flow.step === 'recommendations' && (
                    <RecommendationsScreen
                        brandTheme={flow.brandTheme}
                        recsLoading={flow.recsLoading}
                        selectedMoodDef={selectedMoodDef}
                        budtenderContext={flow.budtenderContext}
                        budtenderName={flow.budtenderName}
                        setBudtenderName={flow.setBudtenderName}
                        voiceOutput={flow.voiceOutput}
                        micIsActive={flow.smokeyVoice.state === 'recording'}
                        micIsProcessing={flow.smokeyVoice.state === 'processing'}
                        assistantSummary={flow.assistantSummary}
                        assistantError={flow.assistantError}
                        smokeyVoice={flow.smokeyVoice}
                        micPermission={flow.micPermission}
                        handleRequestMicPermission={flow.handleRequestMicPermission}
                        isBrave={flow.isBrave}
                        handleMicPointerDown={flow.handleMicPointerDown}
                        handleMicPointerUp={flow.handleMicPointerUp}
                        assistantQuery={flow.assistantQuery}
                        setAssistantQuery={flow.setAssistantQuery}
                        handleAssistantSearch={flow.handleAssistantSearch}
                        assistantLoading={flow.assistantLoading}
                        handleVoiceToggle={flow.handleVoiceToggle}
                        products={flow.products}
                        cart={flow.cart}
                        toggleCart={flow.toggleCart}
                        bundle={flow.bundle}
                        videoUrl={flow.videoUrl}
                        bundleAdded={flow.bundleAdded}
                        setBundleAdded={flow.setBundleAdded}
                        handleSubmit={flow.handleSubmit}
                        loading={flow.loading}
                        error={flow.error}
                        setStep={(s: any) => flow.setStep(s)}
                        resetIdleTimer={flow.resetIdleTimer}
                        cartCount={cartCount}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        panelStyle={panelStyle}
                        accentPanelStyle={accentPanelStyle}
                        primaryButtonStyle={primaryButtonStyle}
                        secondaryButtonStyle={secondaryButtonStyle}
                        handleProductImageError={handleProductImageError}
                    />
                )}

                {/* ── SUCCESS ── */}
                {flow.step === 'success' && (
                    <SuccessScreen
                        brandTheme={flow.brandTheme}
                        firstName={flow.firstName}
                        result={flow.result}
                        budtenderName={flow.budtenderName}
                        cartCount={cartCount}
                        customerId={flow.customerId}
                        orgId={orgId}
                        selectedMood={flow.selectedMood}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        panelStyle={panelStyle}
                        accentPanelStyle={accentPanelStyle}
                    />
                )}

            </AnimatePresence>

            {/* Co-branded Footer */}
            <div className="mt-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: faintTextColor }}>
                    Powered by <span style={{ color: flow.brandTheme.colors.primary }}>BakedBot</span>
                </p>
            </div>
        </div>
    );
}
