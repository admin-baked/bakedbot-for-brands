'use client';

import { motion } from 'framer-motion';
import { 
    Users, 
    Mic, 
    MicOff, 
    Search, 
    Sparkles, 
    Volume2, 
    VolumeX, 
    Loader2, 
    ShoppingCart, 
    Star, 
    ChevronRight 
} from 'lucide-react';
import { CSSProperties, SyntheticEvent } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import { 
    BudtenderContext, 
    TabletProduct, 
    TabletBundle 
} from '@/server/actions/loyalty-tablet';
import { TabletMoodId } from '@/lib/checkin/loyalty-tablet-shared';
import { slideVariants, hexToRgba, AMBER, AMBER_DARK, SMOKEY_FALLBACK_IMAGE, ASK_SMOKEY_PLACEHOLDER } from './shared';

interface RecommendationsScreenProps {
    brandTheme: PublicBrandTheme;
    recsLoading: boolean;
    selectedMoodDef: any;
    budtenderContext: BudtenderContext | null;
    budtenderName: string;
    setBudtenderName: (name: string) => void;
    voiceOutput: any;
    micIsActive: boolean;
    micIsProcessing: boolean;
    assistantSummary: string;
    assistantError: string;
    smokeyVoice: any;
    micPermission: string;
    handleRequestMicPermission: () => void;
    isBrave: boolean;
    handleMicPointerDown: (e: any) => void;
    handleMicPointerUp: (e: any) => void;
    assistantQuery: string;
    setAssistantQuery: (query: string) => void;
    handleAssistantSearch: () => void;
    assistantLoading: boolean;
    handleVoiceToggle: () => void;
    products: TabletProduct[];
    cart: string[];
    toggleCart: (id: string) => void;
    bundle: TabletBundle | null;
    videoUrl: string | null;
    bundleAdded: boolean;
    setBundleAdded: (added: boolean) => void;
    handleSubmit: () => void;
    loading: boolean;
    error: string;
    setStep: (step: any) => void;
    resetIdleTimer: () => void;
    cartCount: number;
    mutedTextColor: string;
    faintTextColor: string;
    panelStyle: CSSProperties;
    accentPanelStyle: CSSProperties;
    primaryButtonStyle: CSSProperties;
    secondaryButtonStyle: CSSProperties;
    handleProductImageError: (e: SyntheticEvent<HTMLImageElement>) => void;
}

export function RecommendationsScreen({
    brandTheme,
    recsLoading,
    selectedMoodDef,
    budtenderContext,
    budtenderName,
    setBudtenderName,
    voiceOutput,
    micIsActive,
    micIsProcessing,
    assistantSummary,
    assistantError,
    smokeyVoice,
    micPermission,
    handleRequestMicPermission,
    isBrave,
    handleMicPointerDown,
    handleMicPointerUp,
    assistantQuery,
    setAssistantQuery,
    handleAssistantSearch,
    assistantLoading,
    handleVoiceToggle,
    products,
    cart,
    toggleCart,
    bundle,
    videoUrl,
    bundleAdded,
    setBundleAdded,
    handleSubmit,
    loading,
    error,
    setStep,
    resetIdleTimer,
    cartCount,
    mutedTextColor,
    faintTextColor,
    panelStyle,
    accentPanelStyle,
    primaryButtonStyle,
    secondaryButtonStyle,
    handleProductImageError
}: RecommendationsScreenProps) {
    if (recsLoading) {
        return (
            <motion.div
                key="recommendations_loading"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25 }}
                className="relative z-10 mx-auto flex flex-col items-center gap-5 w-full max-w-4xl"
            >
                <div className="flex flex-col items-center gap-6 py-8 sm:py-12">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute h-40 w-40 rounded-full animate-ping opacity-20" style={{ backgroundColor: brandTheme.colors.primary }} />
                        <div className="absolute h-32 w-32 rounded-full animate-pulse opacity-30" style={{ backgroundColor: brandTheme.colors.primary }} />
                        <img
                            src="/assets/agents/smokey-main.png"
                            alt="Smokey the AI Budtender"
                            className="relative h-28 w-28 rounded-full object-cover border-4 shadow-xl"
                            style={{ borderColor: brandTheme.colors.primary }}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">
                            Smokey is finding your perfect match...
                        </p>
                        <p className="mt-2" style={{ color: mutedTextColor }}>
                            {selectedMoodDef?.emoji} {selectedMoodDef?.label}
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            key="recommendations"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }}
            className="relative z-10 mx-auto flex flex-col items-center gap-5 w-full max-w-4xl"
        >
            {/* ── Budtender context strip ── */}
            {budtenderContext && (
                <div className="w-full rounded-[24px] border p-4" style={panelStyle}>
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 shrink-0" style={{ color: brandTheme.colors.primary }} />
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: brandTheme.colors.primary }}>
                            For your budtender{budtenderName ? ` — ${budtenderName}` : ''}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {budtenderContext.visitCount > 0 && (
                            <span className="rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hexToRgba(brandTheme.colors.primary, 0.08), color: brandTheme.colors.primary }}>
                                {budtenderContext.visitCount} visit{budtenderContext.visitCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {budtenderContext.lastVisitLabel && (
                            <span className="rounded-full px-3 py-1 font-medium bg-gray-100 text-gray-600">
                                Last: {budtenderContext.lastVisitLabel}
                            </span>
                        )}
                        {budtenderContext.loyaltyPoints > 0 && (
                            <span className="rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hexToRgba(AMBER, 0.12), color: AMBER_DARK }}>
                                ⭐ {budtenderContext.loyaltyPoints} pts
                            </span>
                        )}
                        {budtenderContext.topCategories.slice(0, 3).map(cat => (
                            <span key={cat} className="rounded-full px-3 py-1 font-medium bg-gray-100 text-gray-700 capitalize">
                                {cat}
                            </span>
                        ))}
                        {budtenderContext.badges.slice(0, 2).map(badge => (
                            <span key={badge} className="rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hexToRgba(AMBER, 0.12), color: AMBER_DARK }}>
                                🏅 {badge}
                            </span>
                        ))}
                    </div>
                    {budtenderContext.historySummary && (
                        <p className="mt-2 text-xs leading-relaxed line-clamp-2" style={{ color: mutedTextColor }}>
                            {budtenderContext.historySummary}
                        </p>
                    )}
                </div>
            )}

            {/* ── Budtender name field (first time / new customer) ── */}
            {!budtenderContext && (
                <div className="w-full flex items-center gap-3 rounded-[20px] border px-4 py-2" style={panelStyle}>
                    <Users className="h-4 w-4 shrink-0" style={{ color: mutedTextColor }} />
                    <input
                        type="text"
                        placeholder="Budtender on duty (optional)"
                        value={budtenderName}
                        onChange={e => { setBudtenderName(e.target.value); resetIdleTimer(); }}
                        className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                </div>
            )}

            {/* ── Smokey mascot — centered hero ── */}
            <div className="flex flex-col items-center gap-3 w-full">
                {/* Pulsing mascot */}
                <div className="relative flex items-center justify-center my-2">
                    {/* Outer pulse — active when speaking or recording */}
                    {(voiceOutput.isSpeaking || micIsActive || micIsProcessing) && (
                        <>
                            <div className="absolute h-52 w-52 rounded-full animate-ping opacity-10" style={{ backgroundColor: brandTheme.colors.primary }} />
                            <div className="absolute h-44 w-44 rounded-full animate-pulse opacity-20" style={{ backgroundColor: brandTheme.colors.primary }} />
                        </>
                    )}
                    <div
                        className="absolute h-36 w-36 rounded-full transition-opacity duration-300"
                        style={{
                            backgroundColor: hexToRgba(brandTheme.colors.primary, voiceOutput.isSpeaking || micIsActive ? 0.12 : 0.04),
                        }}
                    />
                    <img
                        src="/assets/agents/smokey-main.png"
                        alt="Smokey the AI Budtender"
                        className="relative h-28 w-28 object-contain drop-shadow-xl"
                    />
                </div>

                {/* Smokey speech bubble */}
                <div className="relative max-w-sm w-full">
                    {/* Triangle pointer up to mascot */}
                    <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '12px solid transparent',
                            borderRight: '12px solid transparent',
                            borderBottom: `12px solid ${hexToRgba(AMBER, 0.2)}`,
                        }}
                    />
                    <div
                        className="rounded-[22px] border-2 p-4 text-center min-h-[64px] flex items-center justify-center"
                        style={accentPanelStyle}
                    >
                        {micIsActive && (
                            <p className="text-sm font-semibold animate-pulse" style={{ color: brandTheme.colors.primary }}>
                                Listening... release to send.
                            </p>
                        )}
                        {micIsProcessing && (
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Smokey is thinking...
                            </p>
                        )}
                        {!micIsActive && !micIsProcessing && assistantSummary && (
                            <p className="text-sm font-medium text-gray-900 leading-relaxed">{assistantSummary}</p>
                        )}
                        {!micIsActive && !micIsProcessing && !assistantSummary && (
                            <p className="text-sm" style={{ color: mutedTextColor }}>
                                {selectedMoodDef?.emoji} Ready to help with <span className="font-bold text-gray-900">{selectedMoodDef?.label}</span>
                            </p>
                        )}
                        {!micIsActive && !micIsProcessing && (assistantError || smokeyVoice.error) && (
                            <p className="text-sm text-red-500">{assistantError || smokeyVoice.error}</p>
                        )}
                    </div>
                </div>

                {/* One-time mic permission prompt — tap triggers browser dialog */}
                {smokeyVoice.isSupported && (micPermission === 'unknown' || micPermission === 'prompt') && (
                    <button
                        onClick={() => { void handleRequestMicPermission(); }}
                        className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold border-2 transition-all active:scale-95 animate-bounce shadow-lg"
                        style={{ 
                            borderColor: brandTheme.colors.primary, 
                            color: '#ffffff', 
                            backgroundColor: brandTheme.colors.primary 
                        }}
                    >
                        <Mic className="h-5 w-5" /> Enable Voice Search
                    </button>
                )}
                {micPermission === 'denied' && (
                    <div className="rounded-2xl bg-red-50 p-4 border border-red-100 max-w-sm">
                        <p className="text-xs text-red-600 font-bold text-center">
                            Mic Access Blocked
                        </p>
                        <p className="text-[10px] text-red-500 text-center mt-1">
                            {isBrave 
                              ? "Brave Shields might be blocking the mic. Tap the lock icon in the address bar to allow Microphone."
                              : "Please enable microphone access in your browser settings to use voice features."}
                        </p>
                    </div>
                )}

                {/* Mic + search row */}
                <div className="flex w-full gap-3 items-center">
                    {/* Hold-to-talk mic — always prominent */}
                    <button
                        onPointerDown={handleMicPointerDown}
                        onPointerUp={handleMicPointerUp}
                        onPointerLeave={handleMicPointerUp}
                        disabled={micIsProcessing}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-all select-none disabled:opacity-60 shadow-md"
                        style={micIsActive
                            ? { backgroundColor: brandTheme.colors.primary, borderColor: brandTheme.colors.primary, color: '#ffffff' }
                            : micIsProcessing
                                ? { ...secondaryButtonStyle, opacity: 0.6 }
                                : { ...secondaryButtonStyle, borderWidth: '2px' }
                        }
                        title="Hold to speak to Smokey"
                    >
                        {micIsProcessing ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : micIsActive ? (
                            <MicOff className="h-6 w-6 animate-pulse" />
                        ) : (
                            <Mic className="h-6 w-6" />
                        )}
                    </button>

                    {/* Search input */}
                    <div className="flex flex-1 items-center gap-2 rounded-[20px] border px-3 py-3 bg-white">
                        <Search className="h-5 w-5 shrink-0" style={{ color: brandTheme.colors.primary }} />
                        <input
                            type="text"
                            value={assistantQuery}
                            onChange={(event) => { setAssistantQuery(event.target.value); resetIdleTimer(); }}
                            placeholder={ASK_SMOKEY_PLACEHOLDER}
                            className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={() => { void handleAssistantSearch(); }}
                        disabled={assistantLoading || assistantQuery.trim().length < 3}
                        className="inline-flex items-center justify-center gap-1.5 rounded-[20px] px-4 py-3 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40 shrink-0"
                        style={primaryButtonStyle}
                    >
                        {assistantLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <><Sparkles className="h-4 w-4" /> Ask</>
                        )}
                    </button>

                    {/* Voice toggle */}
                    <button
                        onClick={handleVoiceToggle}
                        disabled={!voiceOutput.isSupported}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all hover:opacity-95 disabled:opacity-40"
                        style={secondaryButtonStyle}
                        title={voiceOutput.isEnabled ? 'Turn voice off' : 'Turn voice on'}
                    >
                        {voiceOutput.isEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* ── Product cards ── */}
            <div className="w-full space-y-3">
                {products.map(product => {
                    const inCart = cart.includes(product.productId);
                    return (
                        <div
                            key={product.productId}
                            className="flex flex-col gap-4 rounded-[28px] border p-4 transition-all sm:flex-row sm:items-center"
                            style={inCart ? accentPanelStyle : panelStyle}
                        >
                            <div
                                className="relative h-24 w-full overflow-hidden rounded-[22px] border sm:h-28 sm:w-28 sm:shrink-0"
                                style={{ borderColor: '#e5e7eb' }}
                            >
                                <img
                                    src={product.imageUrl || SMOKEY_FALLBACK_IMAGE}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-opacity duration-300"
                                    onError={handleProductImageError}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-lg font-bold text-gray-900 sm:text-xl">{product.name}</p>
                                <p className="mt-1 truncate text-sm font-medium" style={{ color: brandTheme.colors.primary }}>
                                    {product.category}{product.brandName ? ` - ${product.brandName}` : ''}
                                </p>
                                <p className="mt-2 text-sm leading-relaxed" style={{ color: mutedTextColor }}>{product.reason}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                                <p className="text-2xl font-black text-gray-900">${product.price.toFixed(2)}</p>
                                <button
                                    onClick={() => toggleCart(product.productId)}
                                    className="rounded-[18px] px-4 py-2 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                                    style={inCart ? secondaryButtonStyle : primaryButtonStyle}
                                >
                                    {inCart ? 'Added ✓' : '+ Add'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Bundle ── */}
            {bundle && (
                <div className="w-full rounded-[30px] border p-5 transition-all sm:p-6" style={bundleAdded ? accentPanelStyle : panelStyle}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Star className="h-5 w-5" style={{ color: AMBER }} />
                                <span className="text-sm font-bold uppercase tracking-wide" style={{ color: AMBER_DARK }}>Bundle Pick</span>
                            </div>
                            <p className="text-xl font-black text-gray-900">{bundle.name}</p>
                            <p className="mb-2 text-sm italic" style={{ color: mutedTextColor }}>{bundle.tagline}</p>
                            
                            {/* Remotion on AWS Video Player */}
                            {videoUrl && (
                                <div className="my-4 overflow-hidden rounded-2xl border bg-black shadow-inner">
                                    <video 
                                        src={videoUrl} 
                                        controls 
                                        autoPlay 
                                        muted 
                                        playsInline
                                        className="aspect-video w-full"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                {bundle.products.map(p => (
                                    <p key={p.productId} className="text-sm" style={{ color: mutedTextColor }}>
                                        <ChevronRight className="inline h-3 w-3" style={{ color: brandTheme.colors.primary }} /> {p.name}
                                    </p>
                                ))}
                            </div>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-2xl font-black text-gray-900">${bundle.totalPrice.toFixed(2)}</p>
                            <button
                                onClick={() => { setBundleAdded(!bundleAdded); resetIdleTimer(); }}
                                className="mt-2 rounded-[18px] border px-4 py-2 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                                style={bundleAdded ? primaryButtonStyle : secondaryButtonStyle}
                            >
                                {bundleAdded ? 'Added Bundle ✓' : '+ Add Bundle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CTA ── */}
            <div className="w-full flex gap-4">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-3 rounded-[28px] py-5 text-xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
                    style={primaryButtonStyle}
                >
                    {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <>
                            {cartCount > 0
                                ? <><ShoppingCart className="h-6 w-6" /> Continue with {cartCount} item{cartCount !== 1 ? 's' : ''}</>
                                : <><Users className="h-6 w-6" /> Continue to Budtender</>
                            }
                        </>
                    )}
                </button>
            </div>

            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <button onClick={() => setStep('mood')} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Change feeling</button>
        </motion.div>
    );
}
