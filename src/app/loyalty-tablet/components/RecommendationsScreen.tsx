'use client';

import { motion, AnimatePresence } from 'framer-motion';
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
    ChevronRight,
    X,
    Leaf,
    Zap,
    Wind,
} from 'lucide-react';
import { CSSProperties, SyntheticEvent, useState } from 'react';
import { PublicBrandTheme } from '@/lib/checkin/checkin-management-shared';
import {
    BudtenderContext,
    TabletProduct,
    TabletBundle
} from '@/server/actions/loyalty-tablet';
import { slideVariants, hexToRgba, AMBER, AMBER_DARK, ASK_SMOKEY_PLACEHOLDER } from './shared';
import { getCategoryIconName, getCategoryIconColor } from '@/lib/utils/product-image';
import * as LucideIcons from 'lucide-react';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';

function CategoryIconPlaceholder({ category, size = 'md' }: { category: string; size?: 'md' | 'lg' }) {
    const iconName = getCategoryIconName(category);
    // @ts-ignore - Dynamic lucide icon access — established pattern (getCategoryIconName guarantees a valid name)
    const Icon = LucideIcons[iconName] || LucideIcons.Leaf;
    const colorClass = getCategoryIconColor(category);
    const sizeClass = size === 'lg' ? 'h-20 w-20 opacity-40' : 'h-12 w-12';
    return <Icon className={`${sizeClass} ${colorClass}`} strokeWidth={1.5} />;
}

const TIER_LABELS: Record<string, { label: string; bg: string; text: string }> = {
    budget: { label: 'Value', bg: 'rgba(34,197,94,0.12)', text: '#15803d' },
    mid:    { label: 'Mid',   bg: 'rgba(59,130,246,0.12)', text: '#1d4ed8' },
    premium: { label: 'Premium', bg: 'rgba(245,158,11,0.12)', text: '#b45309' },
};

interface RecommendationsScreenProps {
    brandTheme: PublicBrandTheme;
    recsLoading: boolean;
    isReturningCustomer?: boolean;
    selectedMoodDef: any;
    budtenderContext: BudtenderContext | null;
    budtenderName: string;
    setBudtenderName: (name: string) => void;
    voiceOutput: any;
    micIsActive: boolean;
    micIsProcessing: boolean;
    autoListening: boolean;
    assistantSummary: string;
    assistantError: string;
    smokeyVoice: any;
    micPermission: string;
    handleRequestMicPermission: () => void;
    isBrave: boolean;
    handleMicPointerDown: (e: any) => void;
    handleMicPointerUp: (e: any) => void;
    handleAutoListenToggle: () => void;
    assistantQuery: string;
    setAssistantQuery: (query: string) => void;
    handleAssistantSearch: (rawQuery?: string, unlimited?: boolean) => void;
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
    availableCategories: string[];
    onCategoryBrowse: (category: string) => void;
}

function ProductDetailModal({
    product,
    inCart,
    onClose,
    onToggleCart,
    onFindMore,
    brandTheme,
    mutedTextColor,
    faintTextColor,
    panelStyle,
    primaryButtonStyle,
    secondaryButtonStyle,
}: {
    product: TabletProduct;
    inCart: boolean;
    onClose: () => void;
    onToggleCart: () => void;
    onFindMore: (query: string) => void;
    brandTheme: PublicBrandTheme;
    mutedTextColor: string;
    faintTextColor: string;
    panelStyle: CSSProperties;
    primaryButtonStyle: CSSProperties;
    secondaryButtonStyle: CSSProperties;
}) {
    const tier = product.tier ? TIER_LABELS[product.tier] : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
                style={{ backgroundColor: 'white' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Product image */}
                <div className="relative aspect-video w-full bg-gray-100">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-50">
                            {(() => {
                                const iconName = getCategoryIconName(product.category);
                                // @ts-ignore
                                const CategoryIcon = LucideIcons[iconName] || LucideIcons.Leaf;
                                const iconColor = getCategoryIconColor(product.category);
                                return <CategoryIcon className={`h-20 w-20 ${iconColor} opacity-40`} strokeWidth={1.5} />;
                            })()}
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    {tier && (
                        <span
                            className="absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                            style={{ backgroundColor: tier.bg, color: tier.text }}
                        >
                            {tier.label}
                        </span>
                    )}
                </div>

                <div className="p-5 space-y-4">
                    {/* Header */}
                    <div>
                        <h2 className="text-xl font-black text-gray-900 leading-tight">{product.name}</h2>
                        {product.brandName && (
                            <p className="mt-0.5 text-sm font-medium" style={{ color: brandTheme.colors.primary }}>
                                {product.brandName}
                            </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">{product.category}</span>
                            <span className="text-2xl font-black text-gray-900">${product.price.toFixed(2)}</span>
                            {product.strainType && (
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 capitalize">{product.strainType}</span>
                            )}
                        </div>
                    </div>

                    {/* Potency */}
                    {(product.thcPercent || product.cbdPercent) && (
                        <div className="flex gap-3">
                            {product.thcPercent && (
                                <div className="flex items-center gap-1.5 rounded-2xl px-4 py-2" style={{ backgroundColor: hexToRgba(brandTheme.colors.primary, 0.08) }}>
                                    <Leaf className="h-4 w-4" style={{ color: brandTheme.colors.primary }} />
                                    <span className="text-sm font-bold" style={{ color: brandTheme.colors.primary }}>THC {product.thcPercent}%</span>
                                </div>
                            )}
                            {product.cbdPercent && (
                                <div className="flex items-center gap-1.5 rounded-2xl px-4 py-2 bg-blue-50">
                                    <Zap className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-bold text-blue-700">CBD {product.cbdPercent}%</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    {product.description && (
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: mutedTextColor }}>About</p>
                            <p className="text-sm leading-relaxed text-gray-700">{product.description}</p>
                        </div>
                    )}

                    {/* Effects */}
                    {product.effects && product.effects.length > 0 && (
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: mutedTextColor }}>Effects</p>
                            <div className="flex flex-wrap gap-2">
                                {product.effects.map(effect => (
                                    <span key={effect} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{effect}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Terpenes */}
                    {product.terpenes && product.terpenes.length > 0 && (
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: mutedTextColor }}>
                                <Wind className="h-3 w-3" /> Terpenes
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {product.terpenes.map(t => (
                                    <span key={t} className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600">{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Smokey's reason */}
                    <div className="rounded-2xl p-4" style={{ backgroundColor: hexToRgba(AMBER, 0.08) }}>
                        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: AMBER_DARK }}>Why Smokey picked it</p>
                        <p className="text-sm text-gray-700">{product.reason}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onToggleCart}
                            className="flex-1 rounded-[18px] py-3 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                            style={inCart ? secondaryButtonStyle : primaryButtonStyle}
                        >
                            {inCart ? 'Added ✓' : '+ Add to Cart'}
                        </button>
                        <button
                            onClick={() => {
                                onFindMore(`more ${product.category} like ${product.name}`);
                                onClose();
                            }}
                            className="rounded-[18px] border px-4 py-3 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                            style={secondaryButtonStyle}
                        >
                            Find More Like This
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function RecommendationsScreen({
    brandTheme,
    recsLoading,
    isReturningCustomer,
    selectedMoodDef,
    budtenderContext,
    budtenderName,
    setBudtenderName,
    voiceOutput,
    micIsActive,
    micIsProcessing,
    autoListening,
    assistantSummary,
    assistantError,
    smokeyVoice,
    micPermission,
    handleRequestMicPermission,
    isBrave,
    handleMicPointerDown,
    handleMicPointerUp,
    handleAutoListenToggle,
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
    handleProductImageError,
    availableCategories,
    onCategoryBrowse
}: RecommendationsScreenProps) {
    const [selectedProduct, setSelectedProduct] = useState<TabletProduct | null>(null);

    const handleFindMore = (query: string) => {
        setAssistantQuery(query);
        void handleAssistantSearch(query);
    };

    if (recsLoading) {
        return (
            <motion.div
                key="recommendations_loading"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25 }}
                className="relative z-10 mx-auto flex flex-col items-center gap-6 w-full max-w-2xl"
            >
                <div className="flex flex-col items-center gap-5 pt-8 sm:pt-12">
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
                        <p className="mt-1" style={{ color: mutedTextColor }}>
                            {selectedMoodDef?.emoji} {selectedMoodDef?.label}
                        </p>
                    </div>
                </div>

                {availableCategories.length > 0 && (
                    <div className="w-full flex flex-col items-center gap-3 pb-8">
                        <p className="text-sm font-medium" style={{ color: mutedTextColor }}>
                            Or browse the full menu while you wait:
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {availableCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => onCategoryBrowse(cat)}
                                    className="rounded-full px-4 py-2 text-sm font-semibold border transition-all hover:opacity-90 active:scale-[0.97]"
                                    style={{ borderColor: brandTheme.colors.primary, color: brandTheme.colors.primary, backgroundColor: 'rgba(255,255,255,0.8)' }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <>
            {/* Product detail modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <ProductDetailModal
                        product={selectedProduct}
                        inCart={cart.includes(selectedProduct.productId)}
                        onClose={() => setSelectedProduct(null)}
                        onToggleCart={() => { toggleCart(selectedProduct.productId); resetIdleTimer(); }}
                        onFindMore={handleFindMore}
                        brandTheme={brandTheme}
                        mutedTextColor={mutedTextColor}
                        faintTextColor={faintTextColor}
                        panelStyle={panelStyle}
                        primaryButtonStyle={primaryButtonStyle}
                        secondaryButtonStyle={secondaryButtonStyle}
                    />
                )}
            </AnimatePresence>

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
                    {budtenderContext.lastOrderItems && budtenderContext.lastOrderItems.length > 0 && (
                        <div className="mt-2 rounded-xl p-3" style={{ backgroundColor: hexToRgba(brandTheme.colors.primary, 0.04) }}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: brandTheme.colors.primary }}>
                                Last Order{budtenderContext.lastOrderDate ? ` — ${budtenderContext.lastOrderDate}` : ''}
                                {budtenderContext.lastOrderTotal ? ` ($${budtenderContext.lastOrderTotal.toFixed(2)})` : ''}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {budtenderContext.lastOrderItems.slice(0, 6).map((item, idx) => (
                                    <span key={idx} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-white border" style={{ borderColor: hexToRgba(brandTheme.colors.primary, 0.15), color: 'rgb(55,65,81)' }}>
                                        {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {!budtenderContext.lastOrderItems && budtenderContext.historySummary && (
                        <p className="mt-2 text-xs leading-relaxed line-clamp-2" style={{ color: mutedTextColor }}>
                            {budtenderContext.historySummary}
                        </p>
                    )}
                </div>
            )}

            {!budtenderContext && isReturningCustomer && (
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

            {/* ── Smokey mascot ── */}
            <div className="flex flex-col items-center gap-3 w-full">
                <div className="relative flex items-center justify-center my-2">
                    {(voiceOutput.isSpeaking || micIsActive || micIsProcessing) && (
                        <>
                            <div className="absolute h-52 w-52 rounded-full animate-ping opacity-10" style={{ backgroundColor: brandTheme.colors.primary }} />
                            <div className="absolute h-44 w-44 rounded-full animate-pulse opacity-20" style={{ backgroundColor: brandTheme.colors.primary }} />
                        </>
                    )}
                    <div
                        className="absolute h-36 w-36 rounded-full transition-opacity duration-300"
                        style={{ backgroundColor: hexToRgba(brandTheme.colors.primary, voiceOutput.isSpeaking || micIsActive ? 0.12 : 0.04) }}
                    />
                    <img
                        src="/assets/agents/smokey-main.png"
                        alt="Smokey the AI Budtender"
                        className="relative h-28 w-28 object-contain drop-shadow-xl"
                    />
                </div>

                {/* Speech bubble */}
                <div className="relative max-w-sm w-full">
                    <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0"
                        style={{ borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: `12px solid ${hexToRgba(AMBER, 0.2)}` }}
                    />
                    <div
                        className="rounded-[22px] border-2 p-4 text-center min-h-[64px] flex items-center justify-center"
                        style={accentPanelStyle}
                    >
                        {micIsActive && (
                            <p className="text-sm font-semibold animate-pulse" style={{ color: brandTheme.colors.primary }}>
                                {autoListening ? 'Listening... speak to Smokey' : 'Listening... release to send.'}
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

                {smokeyVoice.isSupported && (micPermission === 'unknown' || micPermission === 'prompt') && (
                    <button
                        onClick={() => { void handleRequestMicPermission(); }}
                        className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold border-2 transition-all active:scale-95 animate-bounce shadow-lg"
                        style={{ borderColor: brandTheme.colors.primary, color: '#ffffff', backgroundColor: brandTheme.colors.primary }}
                    >
                        <Mic className="h-5 w-5" /> Enable Voice Search
                    </button>
                )}
                {micPermission === 'denied' && (
                    <div className="rounded-2xl bg-red-50 p-4 border border-red-100 max-w-sm">
                        <p className="text-xs text-red-600 font-bold text-center">Mic Access Blocked</p>
                        <p className="text-[10px] text-red-500 text-center mt-1">
                            {isBrave
                                ? "Brave Shields might be blocking the mic. Tap the lock icon in the address bar to allow Microphone."
                                : "Please enable microphone access in your browser settings to use voice features."}
                        </p>
                    </div>
                )}

                {/* Mic + search row */}
                <div className="flex w-full gap-3 items-center">
                    <button
                        onClick={micPermission === 'granted' ? handleAutoListenToggle : undefined}
                        onPointerDown={micPermission !== 'granted' ? handleMicPointerDown : undefined}
                        onPointerUp={micPermission !== 'granted' ? handleMicPointerUp : undefined}
                        onPointerLeave={micPermission !== 'granted' ? handleMicPointerUp : undefined}
                        disabled={micIsProcessing}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-all select-none disabled:opacity-60 shadow-md"
                        style={micIsActive || autoListening
                            ? { backgroundColor: brandTheme.colors.primary, borderColor: brandTheme.colors.primary, color: '#ffffff' }
                            : micIsProcessing ? { ...secondaryButtonStyle, opacity: 0.6 } : { ...secondaryButtonStyle, borderWidth: '2px' }}
                        title={autoListening ? 'Tap to mute Smokey' : 'Tap to enable always-listening'}
                    >
                        {micIsProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : autoListening || micIsActive ? <Mic className="h-6 w-6 animate-pulse" /> : <MicOff className="h-6 w-6" />}
                    </button>

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
                        {assistantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Ask</>}
                    </button>

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

                {/* ── Quick Chips & Category Browse — single scrollable row ── */}
                <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <button
                        onClick={() => { setAssistantQuery(''); handleAssistantSearch('', true); resetIdleTimer(); }}
                        className="shrink-0 flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold bg-white transition hover:opacity-90 active:scale-95 shadow-sm"
                        style={{ borderColor: brandTheme.colors.primary, color: brandTheme.colors.primary }}
                    >
                        Full Menu
                    </button>
                    {availableCategories.slice(0, 5).map(cat => (
                        <button
                            key={cat}
                            onClick={() => { onCategoryBrowse(cat); resetIdleTimer(); }}
                            className="shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
                            style={{ borderColor: brandTheme.colors.primary, color: brandTheme.colors.primary, backgroundColor: 'rgba(255,255,255,0.9)' }}
                        >
                            {cat}
                        </button>
                    ))}
                    {[
                        { label: '☀️ Sativas', query: 'sativa' },
                        { label: '🌙 Indicas', query: 'indica' },
                        { label: '🔀 Hybrids', query: 'hybrid' },
                        { label: '💰 Under $25', query: 'show me products under $25' },
                        { label: '⭐ Premium', query: 'show me premium top-shelf products' },
                    ].map(chip => (
                        <button
                            key={chip.label}
                            onClick={() => { handleAssistantSearch(chip.query, true); resetIdleTimer(); }}
                            className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 active:scale-95"
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Product cards ── */}
            {(() => {
                const isGrid = !bundle && products.length >= 4;
                return (
            <div className={isGrid
                ? "w-full grid grid-cols-3 gap-2 overflow-y-auto pb-28 pr-1"
                : "w-full flex gap-3 overflow-x-auto snap-x pb-28 px-1"}
                style={{ WebkitOverflowScrolling: 'touch', maxHeight: isGrid ? '65vh' : undefined }}
            >
                {products.map(product => {
                    const inCart = cart.includes(product.productId);
                    const domainProduct = {
                        id: product.productId,
                        name: product.name,
                        category: product.category,
                        price: product.price ?? 0,
                        imageUrl: product.imageUrl,
                        brandName: product.brandName,
                        thcPercent: product.thcPercent,
                        cbdPercent: product.cbdPercent,
                        strainType: product.strainType,
                        description: product.reason,
                    };
                    return (
                        <div key={product.productId} className={isGrid ? '' : 'min-w-[240px] snap-center shrink-0'}>
                            <OversizedProductCard
                                product={domainProduct as any}
                                onAddToCart={() => { toggleCart(product.productId); resetIdleTimer(); }}
                                onClick={() => { setSelectedProduct(product); resetIdleTimer(); }}
                                inCart={inCart ? 1 : 0}
                                primaryColor={brandTheme.colors.primary}
                                showQuickAdd={true}
                                size="compact"
                                isTouchDevice={true}
                                dealBadge={product.tier === 'premium' ? 'Top Tier' : undefined}
                            />
                        </div>
                    );
                })}
            </div>
                );
            })()}

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

                            {videoUrl && (
                                <div className="my-4 overflow-hidden rounded-2xl border bg-black shadow-inner">
                                    <video src={videoUrl} controls autoPlay muted playsInline className="aspect-video w-full" />
                                </div>
                            )}

                            <div className="space-y-1">
                                {bundle.products.map((p: TabletProduct) => (
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

            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <button onClick={() => setStep('mood')} className="text-sm hover:opacity-70 pb-4" style={{ color: faintTextColor }}>&larr; Change feeling</button>
        </motion.div>

        {/* ── Sticky Checkout bar — always visible in viewport ── */}
        <div
            className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-3"
            style={{ background: 'linear-gradient(to top, rgba(15,15,26,0.97) 70%, transparent)' }}
        >
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-[28px] py-5 text-xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 shadow-2xl"
                style={primaryButtonStyle}
            >
                {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : cartCount > 0 ? (
                    <><ShoppingCart className="h-6 w-6" /> Checkout — {cartCount} item{cartCount !== 1 ? 's' : ''}</>
                ) : (
                    <><ShoppingCart className="h-6 w-6" /> Checkout</>
                )}
            </button>
        </div>
        </>
    );
}
