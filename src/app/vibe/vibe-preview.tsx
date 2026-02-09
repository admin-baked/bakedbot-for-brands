'use client';

/**
 * Vibe Preview Component
 *
 * Shows a live preview of how a generated vibe looks applied to actual menu products.
 * Designed to entice users to sign up by showing the visual appeal.
 */

import { type PublicVibe, type PublicMobileVibe } from './actions';
import { Monitor, Smartphone, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Sample products for preview
const SAMPLE_PRODUCTS = [
    {
        id: '1',
        name: 'Blue Dream',
        brand: 'House Special',
        category: 'Flower',
        thcPercent: 22,
        cbdPercent: 1,
        price: 35,
        image: 'https://images.unsplash.com/photo-1587439962417-032c97b84b42?w=400&h=400&fit=crop',
        effects: ['Relaxed', 'Creative', 'Happy'],
    },
    {
        id: '2',
        name: 'Wedding Cake',
        brand: 'Premium Gardens',
        category: 'Flower',
        thcPercent: 25,
        cbdPercent: 0.5,
        price: 45,
        image: 'https://images.unsplash.com/photo-1587439962417-032c97b84b42?w=400&h=400&fit=crop',
        effects: ['Euphoric', 'Relaxed', 'Sleepy'],
    },
    {
        id: '3',
        name: 'Sour Diesel',
        brand: 'Craft Cannabis',
        category: 'Flower',
        thcPercent: 20,
        cbdPercent: 0.3,
        price: 40,
        image: 'https://images.unsplash.com/photo-1587439962417-032c97b84b42?w=400&h=400&fit=crop',
        effects: ['Energetic', 'Focused', 'Uplifted'],
    },
    {
        id: '4',
        name: 'Live Resin Cart',
        brand: 'Premium Extracts',
        category: 'Vape',
        thcPercent: 85,
        cbdPercent: 0,
        price: 55,
        image: 'https://images.unsplash.com/photo-1600857082082-f32f51767b56?w=400&h=400&fit=crop',
        effects: ['Potent', 'Fast-acting', 'Long-lasting'],
    },
];

interface VibePreviewProps {
    vibe: PublicVibe | PublicMobileVibe;
    onViewFullPreview?: () => void;
}

export function VibePreview({ vibe, onViewFullPreview }: VibePreviewProps) {
    const isWeb = vibe.type === 'web';
    const config = vibe.config;

    // Apply vibe colors to CSS variables
    // Access theme properties safely for both web and mobile vibes
    const theme = 'theme' in config ? config.theme : undefined;
    const colors = theme?.colors;
    // Radius only exists for web vibes
    const radius = (theme && 'radius' in theme) ? theme.radius : undefined;

    const previewStyle = {
        '--preview-primary': colors?.primary || '#10b981',
        '--preview-secondary': colors?.secondary || '#3b82f6',
        '--preview-accent': colors?.accent || '#f59e0b',
        '--preview-background': colors?.background || '#ffffff',
        '--preview-surface': colors?.surface || '#f9fafb',
        '--preview-text': colors?.text || '#111827',
        '--preview-text-muted': colors?.textMuted || '#6b7280',
        '--preview-border': colors?.border || '#e5e7eb',
        '--preview-radius': radius?.default === 'none' ? '0px' :
                           radius?.default === 'sm' ? '4px' :
                           radius?.default === 'md' ? '8px' :
                           radius?.default === 'lg' ? '16px' :
                           radius?.default === 'xl' ? '24px' :
                           radius?.default === 'full' ? '9999px' : '8px',
    } as React.CSSProperties;

    if (isWeb) {
        return (
            <div className="border rounded-lg overflow-hidden bg-gray-50">
                {/* Preview Header */}
                <div className="flex items-center justify-between p-4 bg-white border-b">
                    <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Live Preview</span>
                        <Badge variant="secondary" className="text-xs">Web</Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={onViewFullPreview}
                    >
                        <Eye className="h-3 w-3" />
                        View Full Menu
                    </Button>
                </div>

                {/* Browser Chrome */}
                <div className="px-4 py-2 bg-gray-100 border-b flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500">
                        bakedbot.ai/yourbrand
                    </div>
                </div>

                {/* Preview Content */}
                <div style={previewStyle} className="p-6 bg-white min-h-[400px]">
                    {/* Hero Section */}
                    <div
                        className="rounded-lg p-8 mb-6 relative overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, var(--preview-primary), var(--preview-secondary))`,
                            borderRadius: `var(--preview-radius)`,
                        }}
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {config.name || 'Your Dispensary'}
                        </h1>
                        <p className="text-white/90 text-sm">
                            Premium cannabis products, delivered
                        </p>
                    </div>

                    {/* Product Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {SAMPLE_PRODUCTS.slice(0, 4).map((product) => (
                            <div
                                key={product.id}
                                className="group cursor-pointer transition-transform hover:scale-[1.02]"
                                style={{
                                    backgroundColor: 'var(--preview-surface)',
                                    borderRadius: `var(--preview-radius)`,
                                    border: '1px solid var(--preview-border)',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Product Image */}
                                <div className="aspect-square bg-gray-200 relative overflow-hidden">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div
                                        className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-white rounded"
                                        style={{ backgroundColor: 'var(--preview-accent)' }}
                                    >
                                        {product.thcPercent}% THC
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="p-3">
                                    <h3
                                        className="font-semibold text-sm mb-1 truncate"
                                        style={{ color: 'var(--preview-text)' }}
                                    >
                                        {product.name}
                                    </h3>
                                    <p
                                        className="text-xs mb-2 truncate"
                                        style={{ color: 'var(--preview-text-muted)' }}
                                    >
                                        {product.brand}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="text-lg font-bold"
                                            style={{ color: 'var(--preview-primary)' }}
                                        >
                                            ${product.price}
                                        </span>
                                        <button
                                            className="px-3 py-1 text-xs font-medium text-white rounded"
                                            style={{
                                                backgroundColor: 'var(--preview-primary)',
                                                borderRadius: `var(--preview-radius)`,
                                            }}
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-6 text-center">
                        <Link href="/signup">
                            <Button
                                size="sm"
                                className="gap-2"
                                style={{
                                    backgroundColor: 'var(--preview-accent)',
                                    borderRadius: `var(--preview-radius)`,
                                }}
                            >
                                <ExternalLink className="h-3 w-3" />
                                Apply This Vibe to Your Menu
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile Preview
    const mobileVibe = vibe as PublicMobileVibe;
    return (
        <div className="border rounded-lg overflow-hidden bg-gray-50">
            {/* Preview Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b">
                <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Mobile Preview</span>
                    <Badge variant="secondary" className="text-xs">
                        {mobileVibe.platform === 'both' ? 'iOS + Android' :
                         mobileVibe.platform === 'ios' ? 'iOS' : 'Android'}
                    </Badge>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={onViewFullPreview}
                >
                    <Eye className="h-3 w-3" />
                    View Details
                </Button>
            </div>

            {/* Mobile Device Mockup */}
            <div className="flex justify-center p-8 bg-gradient-to-br from-gray-100 to-gray-200">
                <div
                    className="relative w-[280px] h-[580px] bg-black rounded-[3rem] shadow-2xl border-8 border-gray-800 overflow-hidden"
                >
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />

                    {/* Screen Content */}
                    <div
                        style={previewStyle}
                        className="w-full h-full bg-white overflow-y-auto"
                    >
                        {/* Status Bar */}
                        <div className="h-12 bg-white flex items-end justify-between px-6 pb-2">
                            <span className="text-xs font-semibold">9:41</span>
                            <div className="flex gap-1 text-xs">
                                <span>📶</span>
                                <span>📡</span>
                                <span>🔋</span>
                            </div>
                        </div>

                        {/* Header */}
                        <div
                            className="px-4 py-4 flex items-center justify-between border-b"
                            style={{ borderColor: 'var(--preview-border)' }}
                        >
                            <h1
                                className="text-xl font-bold"
                                style={{ color: 'var(--preview-text)' }}
                            >
                                Menu
                            </h1>
                            <button
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-full"
                                style={{
                                    backgroundColor: 'var(--preview-primary)',
                                }}
                            >
                                🛒 Cart
                            </button>
                        </div>

                        {/* Product List */}
                        <div className="p-4 space-y-3">
                            {SAMPLE_PRODUCTS.slice(0, 3).map((product) => (
                                <div
                                    key={product.id}
                                    className="flex gap-3 p-3 rounded-xl"
                                    style={{
                                        backgroundColor: 'var(--preview-surface)',
                                        border: '1px solid var(--preview-border)',
                                    }}
                                >
                                    {/* Product Image */}
                                    <div className="w-20 h-20 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="font-semibold text-sm mb-0.5 truncate"
                                            style={{ color: 'var(--preview-text)' }}
                                        >
                                            {product.name}
                                        </h3>
                                        <p
                                            className="text-xs mb-1 truncate"
                                            style={{ color: 'var(--preview-text-muted)' }}
                                        >
                                            {product.brand}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-xs px-2 py-0.5 rounded"
                                                style={{
                                                    backgroundColor: 'var(--preview-accent)',
                                                    color: 'white',
                                                }}
                                            >
                                                {product.thcPercent}% THC
                                            </span>
                                            <span
                                                className="text-sm font-bold"
                                                style={{ color: 'var(--preview-primary)' }}
                                            >
                                                ${product.price}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom CTA */}
                        <div className="p-4">
                            <Link href="/signup" className="block">
                                <button
                                    className="w-full py-3 text-sm font-semibold text-white rounded-xl"
                                    style={{
                                        backgroundColor: 'var(--preview-accent)',
                                    }}
                                >
                                    Apply This Vibe to Your App →
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform Notes */}
            {(mobileVibe.iosNotes || mobileVibe.androidNotes) && (
                <div className="p-4 bg-white border-t space-y-2">
                    {mobileVibe.iosNotes && (
                        <div className="text-xs">
                            <span className="font-semibold text-gray-700">iOS: </span>
                            <span className="text-gray-600">{mobileVibe.iosNotes}</span>
                        </div>
                    )}
                    {mobileVibe.androidNotes && (
                        <div className="text-xs">
                            <span className="font-semibold text-gray-700">Android: </span>
                            <span className="text-gray-600">{mobileVibe.androidNotes}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
