'use client';

/**
 * PublicPageEditBar
 *
 * Floating toolbar shown on public brand pages when the logged-in user
 * is an admin of that org. Provides inline editing + AI SEO optimization.
 */

import { useState, useTransition } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Pencil,
    Sparkles,
    Eye,
    EyeOff,
    X,
    Check,
    Loader2,
    ExternalLink,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { updateBrandPage, toggleBrandPagePublish } from '@/server/actions/brand-pages';
import type {
    BrandPageDoc,
    BrandPageType,
    AboutPageContent,
    LoyaltyPageContent,
    LocationsPageContent,
    CareersPageContent,
} from '@/types/brand-pages';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

interface PublicPageEditBarProps {
    orgId: string;
    pageType: BrandPageType;
    initialContent: BrandPageDoc | null;
    brandColors: { primary: string; secondary: string };
    brandName: string;
    brandSlug: string;
}

interface SeoSuggestions {
    metaTitle: string;
    metaDescription: string;
    h1Suggestion: string;
    openingParagraph: string;
    keywords: string[];
    tips: string[];
}

const PAGE_LABELS: Record<BrandPageType, string> = {
    about: 'About',
    careers: 'Careers',
    locations: 'Locations',
    loyalty: 'Rewards',
    contact: 'Contact',
    press: 'Press',
};

// ============================================================================
// Main Component
// ============================================================================

export function PublicPageEditBar({
    orgId,
    pageType,
    initialContent,
    brandColors,
    brandName,
    brandSlug,
}: PublicPageEditBarProps) {
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isPublished, setIsPublished] = useState(initialContent?.isPublished ?? false);

    // SEO panel state
    const [optimizing, setOptimizing] = useState(false);
    const [seoSuggestions, setSeoSuggestions] = useState<SeoSuggestions | null>(null);
    const [seoOpen, setSeoOpen] = useState(false);

    // Form state — cloned from initialContent so edits don't mutate props
    const [content, setContent] = useState<BrandPageDoc | null>(initialContent);

    const primaryColor = brandColors.primary || '#16a34a';
    const label = PAGE_LABELS[pageType];

    // =========================================================================
    // Handlers
    // =========================================================================

    const handleSave = () => {
        if (!content) return;
        startTransition(async () => {
            try {
                await updateBrandPage(orgId, pageType, content);
                setSheetOpen(false);
                router.refresh();
            } catch {
                // Keep sheet open on error
            }
        });
    };

    const handleTogglePublish = () => {
        startTransition(async () => {
            try {
                const next = !isPublished;
                await toggleBrandPagePublish(orgId, pageType, next);
                setIsPublished(next);
            } catch {
                // silently ignore
            }
        });
    };

    const handleSeoOptimize = async () => {
        setOptimizing(true);
        setSeoSuggestions(null);
        setSeoOpen(true);
        try {
            const res = await fetch('/api/brand-pages/seo-optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId,
                    pageType,
                    content: content ?? {},
                    brandName,
                    brandSlug,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setSeoSuggestions(data);
            }
        } catch {
            // silently ignore
        } finally {
            setOptimizing(false);
        }
    };

    const applySeoField = (field: 'h1Suggestion' | 'openingParagraph' | 'metaTitle') => {
        if (!seoSuggestions || !content) return;
        if (field === 'h1Suggestion') {
            applyHeroTitle(seoSuggestions.h1Suggestion);
        } else if (field === 'openingParagraph') {
            applyHeroDescription(seoSuggestions.openingParagraph);
        }
        // metaTitle could be used for <title> tag in future
    };

    const applyHeroTitle = (value: string) => {
        if (!content) return;
        switch (pageType) {
            case 'about':
                setContent({ ...content, aboutContent: { ...content.aboutContent, heroTitle: value } as AboutPageContent });
                break;
            case 'loyalty':
                setContent({ ...content, loyaltyContent: { ...content.loyaltyContent, heroTitle: value } as LoyaltyPageContent });
                break;
            case 'locations':
                setContent({ ...content, locationsContent: { ...content.locationsContent, heroTitle: value } as LocationsPageContent });
                break;
            case 'careers':
                setContent({ ...content, careersContent: { ...content.careersContent, heroTitle: value } as CareersPageContent });
                break;
        }
    };

    const applyHeroDescription = (value: string) => {
        if (!content) return;
        switch (pageType) {
            case 'about':
                setContent({ ...content, aboutContent: { ...content.aboutContent, heroDescription: value } as AboutPageContent });
                break;
            case 'loyalty':
                setContent({ ...content, loyaltyContent: { ...content.loyaltyContent, heroDescription: value } as LoyaltyPageContent });
                break;
            case 'locations':
                setContent({ ...content, locationsContent: { ...content.locationsContent, heroDescription: value } as LocationsPageContent });
                break;
            case 'careers':
                setContent({ ...content, careersContent: { ...content.careersContent, heroDescription: value } as CareersPageContent });
                break;
        }
    };

    // =========================================================================
    // Render
    // =========================================================================

    return (
        <>
            {/* Floating Toolbar — above Smokey FAB (bottom-6) */}
            <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-2">
                {/* SEO suggestion panel */}
                {seoOpen && (
                    <div className="w-80 bg-background border rounded-xl shadow-xl p-4 text-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 font-semibold">
                                <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                                SEO Suggestions
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSeoOpen(false)}>
                                <X className="h-3 w-3" />
                            </Button>
                        </div>

                        {optimizing ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-3 bg-muted rounded w-1/3 mb-1" />
                                        <div className="h-4 bg-muted rounded w-full" />
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 text-muted-foreground text-xs mt-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Analyzing with AI...
                                </div>
                            </div>
                        ) : seoSuggestions ? (
                            <div className="space-y-3">
                                {/* Title */}
                                <SeoField
                                    label="Meta Title"
                                    value={seoSuggestions.metaTitle}
                                    primaryColor={primaryColor}
                                    onApply={() => {
                                        applyHeroTitle(seoSuggestions.metaTitle);
                                        setSheetOpen(true);
                                    }}
                                />
                                {/* Meta Description */}
                                <SeoField
                                    label="Meta Description"
                                    value={seoSuggestions.metaDescription}
                                    primaryColor={primaryColor}
                                    onApply={() => {
                                        applyHeroDescription(seoSuggestions.metaDescription);
                                        setSheetOpen(true);
                                    }}
                                />
                                {/* H1 */}
                                <SeoField
                                    label="Heading (H1)"
                                    value={seoSuggestions.h1Suggestion}
                                    primaryColor={primaryColor}
                                    onApply={() => {
                                        applyHeroTitle(seoSuggestions.h1Suggestion);
                                        setSheetOpen(true);
                                    }}
                                />
                                {/* Opening Paragraph */}
                                <SeoField
                                    label="Opening Paragraph"
                                    value={seoSuggestions.openingParagraph}
                                    primaryColor={primaryColor}
                                    onApply={() => {
                                        applyHeroDescription(seoSuggestions.openingParagraph);
                                        setSheetOpen(true);
                                    }}
                                />
                                {/* Keywords */}
                                {seoSuggestions.keywords.length > 0 && (
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium mb-1">Target Keywords</p>
                                        <div className="flex flex-wrap gap-1">
                                            {seoSuggestions.keywords.map((kw) => (
                                                <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Tips */}
                                {seoSuggestions.tips.length > 0 && (
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium mb-1">Tips</p>
                                        <ul className="space-y-1">
                                            {seoSuggestions.tips.map((tip, i) => (
                                                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                                    <span className="mt-0.5">•</span>
                                                    <span>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-xs">Could not load suggestions.</p>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 bg-background border rounded-full px-3 py-2 shadow-lg">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 h-8 text-xs font-medium"
                        onClick={() => setSheetOpen(true)}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit {label}
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 h-8 text-xs font-medium"
                        onClick={handleSeoOptimize}
                        disabled={optimizing}
                    >
                        {optimizing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                        )}
                        Optimize SEO
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <a
                        href="/dashboard/brand-pages"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 h-8 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
                    >
                        <ExternalLink className="h-3 w-3" />
                        All Pages
                    </a>
                </div>
            </div>

            {/* Edit Sheet (right-side slide-over) */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-[480px] p-0 flex flex-col">
                    <SheetHeader className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between">
                            <SheetTitle>Edit {label} Page</SheetTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant={isPublished ? 'default' : 'secondary'}>
                                    {isPublished ? 'Published' : 'Draft'}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleTogglePublish}
                                    disabled={isPending}
                                    title={isPublished ? 'Unpublish' : 'Publish'}
                                >
                                    {isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Changes save immediately. Published pages are visible to all visitors.
                        </p>
                    </SheetHeader>

                    <ScrollArea className="flex-1">
                        <div className="px-6 py-4">
                            <PageEditor
                                pageType={pageType}
                                content={content}
                                onChange={setContent}
                                seoSuggestions={seoSuggestions}
                                primaryColor={primaryColor}
                                onRequestSeo={handleSeoOptimize}
                                optimizing={optimizing}
                            />
                        </div>
                    </ScrollArea>

                    <SheetFooter className="px-6 py-4 border-t flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            style={{ backgroundColor: primaryColor }}
                            onClick={handleSave}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}

// ============================================================================
// SEO Field Row
// ============================================================================

function SeoField({
    label,
    value,
    primaryColor,
    onApply,
}: {
    label: string;
    value: string;
    primaryColor: string;
    onApply: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const truncated = value.length > 80 ? value.slice(0, 80) + '…' : value;

    return (
        <div className="border rounded-lg p-2.5">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
                    <p className="text-xs leading-relaxed break-words">
                        {expanded ? value : truncated}
                    </p>
                    {value.length > 80 && (
                        <button
                            className="text-xs text-muted-foreground hover:text-foreground mt-0.5 flex items-center gap-0.5"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {expanded ? 'Less' : 'More'}
                        </button>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs shrink-0"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                    onClick={onApply}
                >
                    Apply
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// Page Editor (per page type)
// ============================================================================

interface PageEditorProps {
    pageType: BrandPageType;
    content: BrandPageDoc | null;
    onChange: (content: BrandPageDoc) => void;
    seoSuggestions: SeoSuggestions | null;
    primaryColor: string;
    onRequestSeo: () => void;
    optimizing: boolean;
}

function PageEditor({
    pageType,
    content,
    onChange,
    seoSuggestions,
    primaryColor,
    onRequestSeo,
    optimizing,
}: PageEditorProps) {
    if (!content) return <p className="text-muted-foreground text-sm">Loading...</p>;

    const SeoButton = () => (
        <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onRequestSeo}
            disabled={optimizing}
        >
            {optimizing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
                <Sparkles className="h-3 w-3" style={{ color: primaryColor }} />
            )}
            {optimizing ? 'Analyzing...' : '✨ Optimize SEO'}
        </Button>
    );

    switch (pageType) {
        case 'about':
            return <AboutEditor content={content} onChange={onChange} SeoButton={SeoButton} seoSuggestions={seoSuggestions} />;
        case 'loyalty':
            return <LoyaltyEditor content={content} onChange={onChange} SeoButton={SeoButton} />;
        case 'locations':
            return <LocationsEditor content={content} onChange={onChange} SeoButton={SeoButton} />;
        case 'careers':
            return <CareersEditor content={content} onChange={onChange} SeoButton={SeoButton} />;
        default:
            return (
                <div className="space-y-4">
                    <HeroFields
                        heroTitle={getHeroTitle(content, pageType)}
                        heroDescription={getHeroDescription(content, pageType)}
                        onTitleChange={(v) => patchHeroTitle(content, pageType, v, onChange)}
                        onDescriptionChange={(v) => patchHeroDescription(content, pageType, v, onChange)}
                    />
                    <SeoButton />
                </div>
            );
    }
}

// ============================================================================
// Per-page editors
// ============================================================================

interface EditorBaseProps {
    content: BrandPageDoc;
    onChange: (content: BrandPageDoc) => void;
    SeoButton: () => React.JSX.Element;
}

function AboutEditor({ content, onChange, SeoButton, seoSuggestions }: EditorBaseProps & { seoSuggestions: SeoSuggestions | null }) {
    const c = content.aboutContent;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">About Page Content</h3>
                <SeoButton />
            </div>
            <Separator />
            <HeroFields
                heroTitle={c?.heroTitle ?? ''}
                heroDescription={c?.heroDescription ?? ''}
                onTitleChange={(v) =>
                    onChange({ ...content, aboutContent: { ...c, heroTitle: v, values: c?.values ?? [] } })
                }
                onDescriptionChange={(v) =>
                    onChange({ ...content, aboutContent: { ...c, heroDescription: v, values: c?.values ?? [] } })
                }
            />
            <div>
                <Label className="text-xs">Our Story</Label>
                <Textarea
                    className="mt-1 text-sm"
                    rows={6}
                    placeholder="Tell your dispensary's story..."
                    value={c?.story ?? ''}
                    onChange={(e) =>
                        onChange({ ...content, aboutContent: { ...c, story: e.target.value, values: c?.values ?? [] } })
                    }
                />
            </div>
            {seoSuggestions && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                    <p className="font-medium text-xs flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        SEO tip
                    </p>
                    <p className="text-muted-foreground">{seoSuggestions.tips[0]}</p>
                </div>
            )}
        </div>
    );
}

function LoyaltyEditor({ content, onChange, SeoButton }: EditorBaseProps) {
    const c = content.loyaltyContent;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Rewards Page Content</h3>
                <SeoButton />
            </div>
            <Separator />
            <HeroFields
                heroTitle={c?.heroTitle ?? ''}
                heroDescription={c?.heroDescription ?? ''}
                onTitleChange={(v) =>
                    onChange({
                        ...content,
                        loyaltyContent: {
                            ...c,
                            heroTitle: v,
                            program: c?.program ?? { name: '', description: '', pointsPerDollar: 1 },
                            howItWorks: c?.howItWorks ?? [],
                            tiers: c?.tiers ?? [],
                            benefits: c?.benefits ?? [],
                        },
                    })
                }
                onDescriptionChange={(v) =>
                    onChange({
                        ...content,
                        loyaltyContent: {
                            ...c,
                            heroDescription: v,
                            program: c?.program ?? { name: '', description: '', pointsPerDollar: 1 },
                            howItWorks: c?.howItWorks ?? [],
                            tiers: c?.tiers ?? [],
                            benefits: c?.benefits ?? [],
                        },
                    })
                }
            />
            <Separator />
            <div>
                <Label className="text-xs">Program Name</Label>
                <Input
                    className="mt-1 text-sm"
                    placeholder="e.g. Thrive Rewards"
                    value={c?.program?.name ?? ''}
                    onChange={(e) =>
                        onChange({
                            ...content,
                            loyaltyContent: {
                                ...c,
                                program: {
                                    ...c?.program,
                                    name: e.target.value,
                                    description: c?.program?.description ?? '',
                                    pointsPerDollar: c?.program?.pointsPerDollar ?? 1,
                                },
                                howItWorks: c?.howItWorks ?? [],
                                tiers: c?.tiers ?? [],
                                benefits: c?.benefits ?? [],
                            },
                        })
                    }
                />
            </div>
            <div>
                <Label className="text-xs">Points Per Dollar Spent</Label>
                <Input
                    className="mt-1 text-sm"
                    type="number"
                    min={1}
                    max={100}
                    value={c?.program?.pointsPerDollar ?? 1}
                    onChange={(e) =>
                        onChange({
                            ...content,
                            loyaltyContent: {
                                ...c,
                                program: {
                                    ...c?.program,
                                    name: c?.program?.name ?? '',
                                    description: c?.program?.description ?? '',
                                    pointsPerDollar: parseInt(e.target.value, 10) || 1,
                                },
                                howItWorks: c?.howItWorks ?? [],
                                tiers: c?.tiers ?? [],
                                benefits: c?.benefits ?? [],
                            },
                        })
                    }
                />
            </div>
        </div>
    );
}

function LocationsEditor({ content, onChange, SeoButton }: EditorBaseProps) {
    const c = content.locationsContent;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Locations Page Content</h3>
                <SeoButton />
            </div>
            <Separator />
            <HeroFields
                heroTitle={c?.heroTitle ?? ''}
                heroDescription={c?.heroDescription ?? ''}
                onTitleChange={(v) =>
                    onChange({ ...content, locationsContent: { ...c, heroTitle: v, locations: c?.locations ?? [] } })
                }
                onDescriptionChange={(v) =>
                    onChange({ ...content, locationsContent: { ...c, heroDescription: v, locations: c?.locations ?? [] } })
                }
            />
            <p className="text-xs text-muted-foreground">
                Location details (address, hours, phone) are managed in{' '}
                <a href="/dashboard/settings" className="underline" target="_blank" rel="noopener noreferrer">
                    Settings → Brand
                </a>
                .
            </p>
        </div>
    );
}

function CareersEditor({ content, onChange, SeoButton }: EditorBaseProps) {
    const c = content.careersContent;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Careers Page Content</h3>
                <SeoButton />
            </div>
            <Separator />
            <HeroFields
                heroTitle={c?.heroTitle ?? ''}
                heroDescription={c?.heroDescription ?? ''}
                onTitleChange={(v) =>
                    onChange({
                        ...content,
                        careersContent: {
                            ...c,
                            heroTitle: v,
                            benefits: c?.benefits ?? [],
                            openPositions: c?.openPositions ?? [],
                        },
                    })
                }
                onDescriptionChange={(v) =>
                    onChange({
                        ...content,
                        careersContent: {
                            ...c,
                            heroDescription: v,
                            benefits: c?.benefits ?? [],
                            openPositions: c?.openPositions ?? [],
                        },
                    })
                }
            />
            <div>
                <Label className="text-xs">Applications Email</Label>
                <Input
                    className="mt-1 text-sm"
                    type="email"
                    placeholder="careers@yourdispensary.com"
                    value={c?.applyEmail ?? ''}
                    onChange={(e) =>
                        onChange({
                            ...content,
                            careersContent: {
                                ...c,
                                applyEmail: e.target.value,
                                benefits: c?.benefits ?? [],
                                openPositions: c?.openPositions ?? [],
                            },
                        })
                    }
                />
            </div>
            <p className="text-xs text-muted-foreground">
                To manage open positions, go to{' '}
                <a href="/dashboard/brand-pages" className="underline" target="_blank" rel="noopener noreferrer">
                    Dashboard → Pages
                </a>
                .
            </p>
        </div>
    );
}

// ============================================================================
// Shared sub-components
// ============================================================================

function HeroFields({
    heroTitle,
    heroDescription,
    onTitleChange,
    onDescriptionChange,
}: {
    heroTitle: string;
    heroDescription: string;
    onTitleChange: (v: string) => void;
    onDescriptionChange: (v: string) => void;
}) {
    return (
        <div className="space-y-4">
            <div>
                <Label className="text-xs">Page Heading (H1)</Label>
                <Input
                    className="mt-1 text-sm"
                    placeholder="Main heading visitors see"
                    value={heroTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                />
            </div>
            <div>
                <Label className="text-xs">Intro Description</Label>
                <Textarea
                    className="mt-1 text-sm"
                    rows={3}
                    placeholder="Short description shown below the heading..."
                    value={heroDescription}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Also used as the page meta description for search engines.
                </p>
            </div>
        </div>
    );
}

// ============================================================================
// Helpers to get/patch hero fields for generic page types
// ============================================================================

function getHeroTitle(content: BrandPageDoc, pageType: BrandPageType): string {
    switch (pageType) {
        case 'contact': return content.contactContent?.heroTitle ?? '';
        case 'press': return content.pressContent?.heroTitle ?? '';
        default: return '';
    }
}

function getHeroDescription(content: BrandPageDoc, pageType: BrandPageType): string {
    switch (pageType) {
        case 'contact': return content.contactContent?.heroDescription ?? '';
        case 'press': return content.pressContent?.heroDescription ?? '';
        default: return '';
    }
}

function patchHeroTitle(
    content: BrandPageDoc,
    pageType: BrandPageType,
    value: string,
    onChange: (c: BrandPageDoc) => void
) {
    switch (pageType) {
        case 'contact':
            onChange({ ...content, contactContent: { ...content.contactContent, heroTitle: value, formEnabled: content.contactContent?.formEnabled ?? false } });
            break;
        case 'press':
            onChange({
                ...content, pressContent: {
                    ...content.pressContent,
                    heroTitle: value,
                    pressContact: content.pressContent?.pressContact ?? { name: '', email: '' },
                    pressKit: content.pressContent?.pressKit ?? [],
                }
            });
            break;
    }
}

function patchHeroDescription(
    content: BrandPageDoc,
    pageType: BrandPageType,
    value: string,
    onChange: (c: BrandPageDoc) => void
) {
    switch (pageType) {
        case 'contact':
            onChange({ ...content, contactContent: { ...content.contactContent, heroDescription: value, formEnabled: content.contactContent?.formEnabled ?? false } });
            break;
        case 'press':
            onChange({
                ...content, pressContent: {
                    ...content.pressContent,
                    heroDescription: value,
                    pressContact: content.pressContent?.pressContact ?? { name: '', email: '' },
                    pressKit: content.pressContent?.pressKit ?? [],
                }
            });
            break;
    }
}
