/**
 * Brand Guide Client Component
 *
 * Main client component for brand guide management.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Palette,
  MessageSquare,
  Target,
  Shield,
  Image as ImageIcon,
  History,
  Download,
  Share2,
  FileText,
  TrendingUp,
  Search,
  Globe,
  Link as LinkIcon,
  PenSquare,
  Megaphone,
  Settings,
  PlayCircle,
  ChevronRight,
  Info,
  CheckCircle2,
  Brain,
  ShieldAlert,
  TrendingUp as StrategyIcon,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import type { BrandGuide, BrandGuideCompetitorSuggestion } from '@/types/brand-guide';
import { VisualIdentityTab } from './components/visual-identity-tab';
import { BrandVoiceTab } from './components/brand-voice-tab';
import { MessagingTab } from './components/messaging-tab';
import { ComplianceTab } from './components/compliance-tab';
import { AssetsTab } from './components/assets-tab';
import { VersionHistoryTab } from './components/version-history-tab';
import { ExportTab } from './components/export-tab';
import { CompetitorAnalysisTab } from './components/competitor-analysis-tab';
import { ABTestingTab } from './components/ab-testing-tab';
import {
  Step1Dialog,
  Step2Dialog,
  Step3Dialog,
  Step4Dialog,
  Step5Dialog,
  Step6Dialog,
  Step7Dialog,
  type Step1Data,
  type Step5Data,
  type Step6Data,
  type Step7Data,
} from './components/setup-step-dialogs';
import { extractBrandGuideFromUrl, deleteBrandGuide } from '@/server/actions/brand-guide';
import { mirrorBrandAssetFromUrl } from '@/server/actions/brand-assets';
import { generateBrandImagesForNewAccount } from '@/server/actions/brand-images';
import { createOrgProfileFromWizard } from '@/server/actions/org-profile';
import { createBrandGuideViaApi } from './create-brand-guide-client';
import type { OrgProfile } from '@/types/org-profile';
import { useToast } from '@/hooks/use-toast';
import {
  buildOrganizationDescriptor,
  formatBusinessModelLabel,
  formatOrganizationTypeLabel,
  inferBusinessModelFromText,
  inferOrganizationTypeFromText,
  isRetailCannabisOrganization,
} from '@/lib/brand-guide-utils';

interface BrandGuideClientProps {
  brandId: string;
  initialBrandGuide?: BrandGuide;
  userRole: string;
}

export function BrandGuideClient({
  brandId,
  initialBrandGuide,
  userRole,
}: BrandGuideClientProps) {
  const [brandGuide, setBrandGuide] = useState<BrandGuide | undefined>(
    initialBrandGuide
  );
  const [activeTab, setActiveTab] = useState('visual');
  const [showCompletionReminder, setShowCompletionReminder] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const isGuideComplete = useMemo(() => (brandGuide?.completenessScore || 0) >= 100, [brandGuide]);
  const canReset = userRole === 'dispensary_admin' || userRole === 'super_user' || userRole === 'super_admin';
  const { toast } = useToast();

  useEffect(() => {
    if (!brandGuide) return;
    if (!isGuideComplete) {
      setShowCompletionReminder(true);
    }
  }, [brandGuide, isGuideComplete]);

  async function handleReset() {
    setResetting(true);
    try {
      const result = await deleteBrandGuide(brandId);
      if (!result.success) throw new Error((result as { success: false; error: string }).error);
      setShowResetDialog(false);
      setBrandGuide(undefined);
    } catch (err) {
      toast({ title: 'Reset failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  }

  // Show create dialog if no brand guide exists
  if (!brandGuide) {
    return <BrandGuideOnboarding brandId={brandId} onComplete={(guide) => setBrandGuide(guide)} />;
  }

  return (
    <div className="space-y-6">
      <Dialog open={showCompletionReminder && !isGuideComplete} onOpenChange={setShowCompletionReminder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish your Brand Guide setup</DialogTitle>
            <DialogDescription>
              Your Brand Guide is not complete yet. We'll keep reminding your team at login until required setup is finished so BakedBot can generate stronger content and visuals.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompletionReminder(false)}>
              Remind me later
            </Button>
            <Button className="bg-baked-green hover:bg-baked-green/90" onClick={() => setShowCompletionReminder(false)}>
              Continue setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Brand Guide</h1>
        <p className="text-muted-foreground mt-2">
          Manage your brand identity, voice, messaging, and assets
        </p>
      </div>

      {/* Status and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={brandGuide.status === 'active' ? 'default' : 'secondary'}>
            {brandGuide.status}
          </Badge>
          <div className="text-sm text-muted-foreground">
            Completeness: {brandGuide.completenessScore}%
          </div>
          {brandGuide.source.method && (
            <div className="text-sm text-muted-foreground">
              Source: {brandGuide.source.method.replace('_', ' ')}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {canReset && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowResetDialog(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset & Rescan
            </Button>
          )}
        </div>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Brand Guide?</DialogTitle>
            <DialogDescription>
              This will permanently delete the current brand guide and re-open the website scan wizard. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Reset & Rescan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress bar */}
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${brandGuide.completenessScore}%` }}
        />
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-9">
            <TabsTrigger value="visual" className="flex items-center gap-1.5 flex-shrink-0">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Visual</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-1.5 flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="messaging" className="flex items-center gap-1.5 flex-shrink-0">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Messaging</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-1.5 flex-shrink-0">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-1.5 flex-shrink-0">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="competitors" className="flex items-center gap-1.5 flex-shrink-0">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Competitors</span>
            </TabsTrigger>
            <TabsTrigger value="abtesting" className="flex items-center gap-1.5 flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">A/B Testing</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5 flex-shrink-0">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-1.5 flex-shrink-0">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="visual">
            <VisualIdentityTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="voice">
            <BrandVoiceTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="messaging">
            <MessagingTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="assets">
            <AssetsTab
              brandId={brandId}
              brandGuide={brandGuide}
              onUpdate={(updates) =>
                setBrandGuide({ ...brandGuide, ...updates } as BrandGuide)
              }
            />
          </TabsContent>

          <TabsContent value="competitors">
            <CompetitorAnalysisTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>

          <TabsContent value="abtesting">
            <ABTestingTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>

          <TabsContent value="history">
            <VersionHistoryTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>

          <TabsContent value="export">
            <ExportTab brandId={brandId} brandGuide={brandGuide} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/**
 * Brand Guide Onboarding Component
 *
 * Guided setup experience with import from website and step-by-step manual setup
 */
interface BrandGuideOnboardingProps {
  brandId: string;
  onComplete: (brandGuide: BrandGuide) => void;
}

const ORGANIZATION_TYPE_VALUES = [
  'dispensary',
  'cannabis_brand',
  'technology_platform',
  'agency_service',
  'community_organization',
  'other',
] as const;

const BUSINESS_MODEL_VALUES = [
  'retail',
  'product_brand',
  'saas_ai_platform',
  'services',
  'media_education',
  'mixed',
] as const;

const DISPENSARY_TYPE_VALUES = ['recreational', 'medical', 'both'] as const;

function normalizeOrganizationType(value: unknown): Step1Data['organizationType'] {
  return typeof value === 'string'
    && ORGANIZATION_TYPE_VALUES.includes(value as typeof ORGANIZATION_TYPE_VALUES[number])
    ? value as Step1Data['organizationType']
    : undefined;
}

function normalizeBusinessModel(value: unknown): Step1Data['businessModel'] {
  return typeof value === 'string'
    && BUSINESS_MODEL_VALUES.includes(value as typeof BUSINESS_MODEL_VALUES[number])
    ? value as Step1Data['businessModel']
    : undefined;
}

function normalizeDispensaryType(value: unknown): Step1Data['dispensaryType'] {
  return typeof value === 'string'
    && DISPENSARY_TYPE_VALUES.includes(value as typeof DISPENSARY_TYPE_VALUES[number])
    ? value as Step1Data['dispensaryType']
    : undefined;
}

function getVoiceDefaultsForStep1(
  data: Partial<Step1Data>
): { tone: string[]; personality: string[] } | null {
  if (data.organizationType === 'technology_platform' || data.businessModel === 'saas_ai_platform') {
    return {
      tone: ['Professional', 'Educational'],
      personality: ['Innovative', 'Trustworthy'],
    };
  }

  if (data.organizationType === 'agency_service' || data.businessModel === 'services') {
    return {
      tone: ['Professional', 'Casual'],
      personality: ['Trustworthy', 'Empowering'],
    };
  }

  if (data.organizationType === 'community_organization') {
    return {
      tone: ['Educational', 'Empathetic'],
      personality: ['Authentic', 'Empowering'],
    };
  }

  if (data.organizationType === 'cannabis_brand' || data.businessModel === 'product_brand') {
    return {
      tone: ['Sophisticated', 'Playful'],
      personality: ['Authentic', 'Friendly'],
    };
  }

  if (data.dispensaryType === 'medical') {
    return {
      tone: ['Professional', 'Educational'],
      personality: ['Trustworthy', 'Empathetic'],
    };
  }

  if (data.dispensaryType === 'both') {
    return {
      tone: ['Professional', 'Casual'],
      personality: ['Friendly', 'Trustworthy'],
    };
  }

  if (data.organizationType === 'dispensary' || data.dispensaryType === 'recreational') {
    return {
      tone: ['Casual', 'Playful'],
      personality: ['Friendly', 'Authentic'],
    };
  }

  return null;
}

function getPreviewActionLabel(data: Partial<Step1Data> | null): string {
  if (!data) return 'Learn More';
  if (data.organizationType === 'technology_platform' || data.businessModel === 'saas_ai_platform') return 'Book Demo';
  if (data.organizationType === 'agency_service' || data.businessModel === 'services') return 'Start a Project';
  if (data.organizationType === 'community_organization' || data.businessModel === 'media_education') return 'Learn More';
  if (data.organizationType === 'cannabis_brand' || data.businessModel === 'product_brand') return 'Explore Brand';
  if (data.organizationType === 'dispensary') return 'Visit Menu';
  return 'Learn More';
}

function BrandGuideOnboarding({ brandId, onComplete }: BrandGuideOnboardingProps) {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhaseLabel, setScanPhaseLabel] = useState('');
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<BrandGuideCompetitorSuggestion[]>([]);

  // Collected data from steps
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<any>(null);
  const [step3Data, setStep3Data] = useState<any>(null);
  const [step4Data, setStep4Data] = useState<any>(null);
  const [step5Data, setStep5Data] = useState<Step5Data | null>(null);
  const [step6Data, setStep6Data] = useState<Step6Data | null>(null);
  const [step7Data, setStep7Data] = useState<Step7Data | null>(null);

  const setupSteps = [
    {
      id: 1,
      icon: PenSquare,
      title: 'Define Brand Basics',
      subtitle: 'Step 1 • Required',
      color: 'text-gray-500 group-hover:text-baked-green',
      completed: !!step1Data,
    },
    {
      id: 2,
      icon: Palette,
      title: 'Select Brand Colors & Logo',
      subtitle: 'Step 2 • Required',
      color: 'text-gray-500 group-hover:text-baked-green',
      completed: !!step2Data,
    },
    {
      id: 3,
      icon: Megaphone,
      title: 'Define Brand Voice',
      subtitle: 'Step 3 • Required',
      color: 'text-gray-500 group-hover:text-baked-green',
      completed: !!step3Data,
    },
    {
      id: 4,
      icon: Settings,
      title: 'Advanced Setup',
      subtitle: 'Optional • Recommended',
      color: 'text-gray-500 group-hover:text-baked-green',
      completed: !!step4Data,
    },
    {
      id: 5,
      icon: StrategyIcon,
      title: 'Business Strategy',
      subtitle: 'Step 5 • Recommended',
      color: 'text-gray-500 group-hover:text-baked-green',
      completed: !!step5Data,
    },
    {
      id: 6,
      icon: Brain,
      title: 'Agent Behavior',
      subtitle: 'Step 6 • Recommended',
      color: 'text-gray-500 group-hover:text-baked-green',
      completed: !!step6Data,
    },
    {
      id: 7,
      icon: ShieldAlert,
      title: 'Hard Limits',
      subtitle: 'Step 7 • Recommended',
      color: 'text-gray-500 group-hover:text-baked-green',
      completed: !!step7Data,
    },
  ];

  // Scan phase definitions: [label, targetProgress, durationMs]
  const SCAN_PHASES: Array<[string, number, number]> = [
    ['Connecting to website…', 8, 2000],
    ['Fetching pages & subpages…', 30, 14000],
    ['Analyzing visual identity…', 50, 8000],
    ['Extracting brand voice…', 65, 7000],
    ['Building messaging profile…', 78, 7000],
    ['Analyzing competitors…', 90, 8000],
    ['Finalizing results…', 97, 5000],
  ];

  useEffect(() => {
    if (!isScanning) {
      setScanProgress(0);
      setScanPhaseLabel('');
      return;
    }
    setScanProgress(0);
    let phaseIdx = 0;
    let rafId: ReturnType<typeof setTimeout>;

    const runPhase = () => {
      if (phaseIdx >= SCAN_PHASES.length) return;
      const [label, target, duration] = SCAN_PHASES[phaseIdx];
      setScanPhaseLabel(label);
      const start = Date.now();
      const prevTarget = phaseIdx === 0 ? 0 : SCAN_PHASES[phaseIdx - 1][1];
      const range = target - prevTarget;
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(elapsed / duration, 1);
        setScanProgress(Math.round(prevTarget + range * pct));
        if (pct < 1) {
          rafId = setTimeout(tick, 80);
        } else {
          phaseIdx++;
          runPhase();
        }
      };
      tick();
    };

    runPhase();
    return () => clearTimeout(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  const handleScanSite = async () => {
    if (!websiteUrl) return;
    setIsScanning(true);

    try {
      const result = await extractBrandGuideFromUrl({
        brandId,
        url: websiteUrl,
        includeCompetitorAnalysis: true,
        // Include social handles from Step 4 if already filled (e.g. re-scan after advanced setup)
        ...(step4Data?.instagramHandle || step4Data?.facebookHandle
          ? {
              socialHandles: {
                instagram: step4Data.instagramHandle || undefined,
                facebook: step4Data.facebookHandle || undefined,
              },
            }
          : {}),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to scan website');
      }

      setSuggestedCompetitors(result.competitorSuggestions || []);

      // Step 1 — derive brand name from extracted data, website title, or URL domain
      // Priority: AI-extracted brandName → website page title → URL domain fallback
      const extractedMessaging = (result as any).messaging ?? {};
      const websiteTitle: string | undefined = (result as any).websiteTitle;
      // Smarter title-to-brand-name derivation:
      // Handles "About Us - Thrive Syracuse" → "Thrive Syracuse"
      //         "Thrive Syracuse | Dispensary" → "Thrive Syracuse"
      // Filters out generic page-name segments so the brand name wins.
      const GENERIC_PAGE_WORDS = ['home', 'about', 'contact', 'menu', 'products', 'verify', 'welcome', 'shop'];
      const titleDerivedName = (() => {
        if (!websiteTitle) return undefined;
        const segments = websiteTitle.split(/\s*[\|\-–]\s*/);
        const nonGeneric = segments.find(s => {
          const lower = s.toLowerCase().trim();
          return !GENERIC_PAGE_WORDS.some(w => lower.startsWith(w)) && s.trim().length >= 3;
        });
        const best = (nonGeneric || segments[0] || '').trim();
        const stripped = best.replace(/\.(com|net|org|io|co|ca|us|biz|info)(\s.*)?$/i, '').trim();
        return stripped || undefined;
      })();

      // Only use domain slug as fallback when it had separators (hyphens/underscores) that
      // produced a multi-word result. A concatenated slug like "thrivesyracuse" → "Thrivesyracuse"
      // is worse than an empty field — leave it blank so the user fills in the real name.
      const rawSlug = websiteUrl
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('.')[0];
      const hadSeparators = /[-_]/.test(rawSlug);
      const domainFallback = hadSeparators
        ? rawSlug
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
        : '';

      // Filter out AI placeholder values that look like "Unknown - ..." or "Unable to extract..."
      const cleanExtractedValue = (value: string | undefined): string => {
        if (!value) return '';
        const lower = value.toLowerCase().trim();
        if (
          lower.startsWith('unknown') ||
          lower.startsWith('unable') ||
          lower === 'n/a' ||
          lower === 'not found' ||
          lower === 'not available' ||
          lower.includes('insufficient') ||
          lower.includes('not provided') ||
          lower.includes('unable to extract') ||
          lower.includes('no content')
        ) {
          return '';
        }
        return value;
      };

      const contextText = [
        websiteTitle,
        result.metadata?.description,
        extractedMessaging.positioning,
        extractedMessaging.missionStatement,
        extractedMessaging.valuePropositions?.join(' '),
      ].filter(Boolean).join(' ');
      const organizationType =
        normalizeOrganizationType(extractedMessaging.organizationType)
        || inferOrganizationTypeFromText(contextText);
      const businessModel =
        normalizeBusinessModel(extractedMessaging.businessModel)
        || inferBusinessModelFromText(contextText, organizationType);
      const dispensaryType =
        normalizeDispensaryType(extractedMessaging.dispensaryType);

      // Clean AI-extracted brand name, falling back to title or domain (only if slug had separators)
      const extractedBrandName: string =
        cleanExtractedValue(extractedMessaging.brandName) || titleDerivedName || domainFallback;

      // Only pre-fill if the user hasn't already completed step 1
      if (!step1Data) {
        setStep1Data({
          brandName: extractedBrandName,
          // Fallback chain: positioning (clearest) → valuePropositions[0] → metadata.description
          description:
            cleanExtractedValue(extractedMessaging.positioning) ||
            cleanExtractedValue(extractedMessaging.valuePropositions?.[0]) ||
            cleanExtractedValue((result as any).metadata?.description) ||
            '',
          tagline: cleanExtractedValue(extractedMessaging.tagline),
          organizationType,
          businessModel,
          // Location + dispensary type — now extracted from the AI prompt
          city: cleanExtractedValue(extractedMessaging.city) || undefined,
          state: cleanExtractedValue(extractedMessaging.state) || undefined,
          dispensaryType,
        });
      }

      // Step 2 — visual identity + logo preview from product image / OG image / favicon
      const detectedLogo = result.visualIdentity?.logo?.primary;
      const shouldUseProductImage = isRetailCannabisOrganization(organizationType, dispensaryType);
      const detectedFeaturedImage =
        (shouldUseProductImage ? (result as any).featuredProductImage : undefined) ||
        (result as any).metadata?.ogImage ||
        (result as any).metadata?.image ||
        result.visualIdentity?.logo?.secondary ||
        undefined;

      if (result.visualIdentity || detectedFeaturedImage) {
        setStep2Data({
          primaryColor: result.visualIdentity?.colors?.primary?.hex || '#4ade80',
          secondaryColor: result.visualIdentity?.colors?.secondary?.hex,
          logoUrl: detectedLogo,
          logoPreviewUrl: detectedLogo,
          featuredImageUrl: detectedFeaturedImage,
        });
      }

      // Step 3 — brand voice
      if (result.voice) {
        setStep3Data({
          tone: result.voice.tone || [],
          personality: result.voice.personality || [],
          doWrite: result.voice.doWrite || [],
          dontWrite: result.voice.dontWrite || [],
        });
      }

      // Open step 1 so user can review/confirm the pre-filled brand name
      setCurrentStep(1);

      toast({
        title: 'Website Scanned',
        description: result.competitorSuggestions?.length
          ? `Brand data extracted from ${websiteUrl}. Found ${result.competitorSuggestions.length} competitor suggestions.`
          : `Brand data extracted from ${websiteUrl}. Review and confirm the steps below.`,
      });
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Could not scan website',
        variant: 'destructive',
      });
    } finally {
      setScanProgress(100);
      setScanPhaseLabel('Complete!');
      setTimeout(() => setIsScanning(false), 600);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const handleCreateManually = async () => {
    // Require at least steps 1-3 to be completed
    if (!step1Data || !step2Data || !step3Data) {
      toast({
        title: 'Incomplete Setup',
        description: 'Please complete Steps 1-3 before creating your brand guide.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const mirrorCandidate = async (sourceUrl: string | undefined, category: 'logo' | 'image') => {
        if (!sourceUrl || !sourceUrl.startsWith('http')) return sourceUrl;
        try {
          const mirrored = await mirrorBrandAssetFromUrl(brandId, {
            sourceUrl,
            category,
            preferredName: category === 'logo' ? 'brand-guide-logo' : 'brand-guide-featured',
          });
          return mirrored.success ? mirrored.assetUrl || sourceUrl : sourceUrl;
        } catch {
          return sourceUrl;
        }
      };

      const persistedLogoUrl = await mirrorCandidate(step2Data.logoUrl, 'logo');
      const persistedFeaturedImageUrl = await mirrorCandidate(step2Data.featuredImageUrl, 'image');
      const organizationIsRetail = isRetailCannabisOrganization(
        step1Data.organizationType,
        step1Data.dispensaryType
      );
      const manualMessaging = {
        brandName: step1Data.brandName,
        tagline: step1Data.tagline || '',
        positioning: step1Data.description,
        missionStatement: '',
        valuePropositions: [],
        keyMessages: [],
        organizationType: step1Data.organizationType,
        businessModel: step1Data.businessModel,
        city: step1Data.city,
        state: step1Data.state,
        dispensaryType: step1Data.dispensaryType,
        targetAudience: step4Data?.targetAudience
          ? { primary: step4Data.targetAudience }
          : undefined,
      };

      // Create brand guide with collected data
      const result = await createBrandGuideViaApi({
        brandId,
        brandName: step1Data.brandName,
        method: 'manual',
        initialData: {
          brandName: step1Data.brandName,
          messaging: manualMessaging as any,
          visualIdentity: {
            colors: {
              primary: {
                hex: step2Data.primaryColor,
                name: 'Primary',
                usage: 'Main brand color',
              },
              secondary: step2Data.secondaryColor
                ? {
                    hex: step2Data.secondaryColor,
                    name: 'Secondary',
                    usage: 'Supporting color',
                  }
                : undefined,
            },
            logo: persistedLogoUrl
              ? {
                  primary: persistedLogoUrl,
                }
              : undefined,
            imagery: persistedFeaturedImageUrl
              ? {
                  style: organizationIsRetail ? 'product-focused' : 'lifestyle',
                  guidelines: organizationIsRetail
                    ? 'Use real menu product imagery that clearly shows flower, packaging, or strain presentation.'
                    : 'Use real brand product imagery instead of stock photography whenever possible.',
                  examples: [persistedFeaturedImageUrl],
                }
              : undefined,
          } as any,
          voice: {
            tone: step3Data.tone,
            personality: step3Data.personality,
            doWrite: step3Data.doWrite,
            dontWrite: step3Data.dontWrite,
          } as any,
        },
      });

      if (!result.success || !result.brandGuide) {
        throw new Error(result.error || 'Failed to create brand guide');
      }

      onComplete(result.brandGuide);

      // Fire-and-forget: write unified OrgProfile if step 5+ completed
      if (step5Data) {
        const brandData: OrgProfile['brand'] = {
          name: step1Data.brandName,
          tagline: step1Data.tagline,
          city: step1Data.city,
          state: step1Data.state,
          organizationType: step1Data.organizationType,
          businessModel: step1Data.businessModel,
          dispensaryType: step1Data.dispensaryType,
          instagramHandle: step4Data?.instagramHandle,
          facebookHandle: step4Data?.facebookHandle,
          visualIdentity: {
            colors: {
              primary: { hex: step2Data?.primaryColor || '#4ade80', name: 'Primary', usage: 'Main brand color' },
              secondary: step2Data?.secondaryColor
                ? { hex: step2Data.secondaryColor, name: 'Secondary', usage: 'Supporting color' }
                : undefined,
            },
            logo: persistedLogoUrl ? { primary: persistedLogoUrl } : undefined,
          },
          voice: {
            tone: step3Data?.tone || [],
            personality: step3Data?.personality || [],
            doWrite: step3Data?.doWrite || [],
            dontWrite: step3Data?.dontWrite || [],
          },
          messaging: {
            tagline: step1Data.tagline,
            positioning: step1Data.description,
            keyMessages: step4Data?.targetAudience ? [step4Data.targetAudience] : [],
          },
          compliance: step1Data.state ? { state: step1Data.state } : {},
          assets: persistedFeaturedImageUrl
            ? {
                heroImages: [persistedFeaturedImageUrl],
                brandImages: { hero: persistedFeaturedImageUrl },
              }
            : undefined,
        };
        const intentData: OrgProfile['intent'] = {
          strategicFoundation: {
            archetype: step5Data.archetype,
            growthStage: step5Data.growthStage,
            competitivePosture: step5Data.competitivePosture,
            geographicStrategy: 'regional',
            weightedObjectives: [],
          },
          valueHierarchies: step6Data?.valueHierarchies || {
            speedVsEducation: 0.5, volumeVsMargin: 0.5, acquisitionVsRetention: 0.5,
            complianceConservatism: 0.5, automationVsHumanTouch: 0.5, brandVoiceFormality: 0.5,
          },
          agentConfigs: {
            smokey: step6Data?.smokeyConfig || {
              recommendationPhilosophy: 'effect_first', upsellAggressiveness: 0.5,
              newUserProtocol: 'guided', productEducationDepth: 'moderate',
            },
            craig: step6Data?.craigConfig || {
              campaignFrequencyCap: 2, preferredChannels: ['sms', 'email'],
              toneArchetype: 'sage', promotionStrategy: 'value_led',
            },
          },
          hardBoundaries: {
            neverDoList: step7Data?.neverDoList || [],
            escalationTriggers: step7Data?.escalationTriggers || [],
          },
          feedbackConfig: {
            captureNegativeFeedback: true,
            requestExplicitFeedback: false,
            minimumInteractionsForAdjustment: 5,
          },
        };
        createOrgProfileFromWizard(brandId, brandData, intentData).catch(() => {
          // Background op — OrgProfile will fall back to legacy bridge if this fails
        });
      }

      // Fire-and-forget: generate brand kit images in background
      // Images will appear in Creative Studio Media panel once ready (~30-60s)
      generateBrandImagesForNewAccount(brandId, result.brandGuide).catch(() => {
        // Background op — silently ignore; images simply won't be pre-populated
      });

      toast({
        title: 'Brand Guide Created',
        description: 'Your brand guide is live! Brand kit images are being generated in the background.',
      });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Could not create brand guide',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Brand Guide</h1>
          <p className="text-gray-500 mt-1">
            Manage your brand identity, voice, messaging, and visual assets.
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start">
          <PlayCircle className="w-4 h-4 text-baked-green" />
          Watch Tutorial
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Input Section (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Import from Website Card */}
          <Card className="p-6 border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-baked-green" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Import from Website</h2>
                <p className="text-sm text-gray-500">
                  Fast-track setup by scanning your website, company pages, and public brand content.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <LinkIcon className="w-3 h-3" />
                </span>
                <Input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-baked-green focus:border-transparent"
                  disabled={isScanning}
                />
              </div>
              <Button
                onClick={handleScanSite}
                disabled={!websiteUrl || isScanning}
                className="bg-baked-green hover:bg-baked-green/90 text-white font-semibold px-6"
              >
                {isScanning ? 'Scanning…' : 'Scan Site'}
              </Button>
            </div>

            {isScanning && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-baked-green" />
                    {scanPhaseLabel}
                  </span>
                  <span className="font-medium text-baked-green">{scanProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-baked-green rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {suggestedCompetitors.length > 0 && (
            <Card className="p-6 border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Search className="w-5 h-5 text-baked-green" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Suggested Competitors</h2>
                  <p className="text-sm text-gray-500">
                    Pulled automatically from your website and market context.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {suggestedCompetitors.map((competitor) => (
                  <div
                    key={competitor.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{competitor.name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {[competitor.city, competitor.state].filter(Boolean).join(', ') || competitor.url}
                        </p>
                        {competitor.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{competitor.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">
                        {competitor.type}
                      </Badge>
                    </div>
                    <a
                      href={competitor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-baked-green font-medium mt-3"
                    >
                      Visit site
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Manual Setup Steps */}
          <div className="space-y-3">
            {setupSteps.map((step) => (
              <Card
                key={step.id}
                className={`group p-4 border-gray-100 hover:border-green-200 cursor-pointer transition-all ${
                  step.completed ? 'border-green-200 bg-green-50/50' : ''
                }`}
                onClick={() => handleStepClick(step.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        step.completed
                          ? 'bg-green-100'
                          : 'bg-gray-100 group-hover:bg-green-100'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-baked-green" />
                      ) : (
                        <step.icon className={step.color} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{step.title}</h3>
                        {step.completed && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-green-100 text-baked-green border-green-200"
                          >
                            DONE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Preview Section (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-8">
            <Card className="overflow-hidden border-gray-100 shadow-lg">
              {/* Preview Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                  Real-time Preview
                </span>
                <Badge variant="outline" className="text-[10px] bg-green-100 text-baked-green border-green-200">
                  LIVE
                </Badge>
              </div>

              {/* Preview Content */}
              <div className="p-6">
                {/* Brand-ready Preview Card */}
                {(() => {
                  const brandColor = step2Data?.primaryColor || '#1a2e1a';
                  const accentColor = step2Data?.secondaryColor || step2Data?.primaryColor || '#4ade80';
                  const logoUrl = step2Data?.logoUrl || step2Data?.logoPreviewUrl;
                  const featuredImageUrl = step2Data?.featuredImageUrl;
                  const tagline = step1Data?.tagline || 'Technology Built for Cannabis Growth';
                  const shortDesc = step1Data?.description
                    ? step1Data.description.length > 90
                      ? step1Data.description.substring(0, 90).trimEnd() + '…'
                      : step1Data.description
                    : 'AI workflows, market intelligence, and brand systems built for modern cannabis teams.';
                  const city = step1Data?.city;
                  const state = step1Data?.state;
                  const locationLine = city && state ? `${city}, ${state}` : city || state || null;
                  const organizationLabel = step1Data?.organizationType
                    ? formatOrganizationTypeLabel(step1Data.organizationType)
                    : 'Cannabis Organization';
                  const businessModelLabel = step1Data?.businessModel
                    ? formatBusinessModelLabel(step1Data.businessModel)
                    : '';
                  const descriptor = step1Data ? buildOrganizationDescriptor({
                    organizationType: step1Data.organizationType,
                    businessModel: step1Data.businessModel,
                    dispensaryType: step1Data.dispensaryType,
                    city: step1Data.city,
                    state: step1Data.state,
                  }) : '';
                  const ctaLabel = getPreviewActionLabel(step1Data);

                  return (
                    <div
                      className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                      style={{ backgroundColor: brandColor }}
                    >
                      {/* Background glow blobs using brand color */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div
                          className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-[80px] opacity-40"
                          style={{ backgroundColor: accentColor }}
                        />
                        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full blur-[60px] opacity-10 bg-white" />
                      </div>

                      {/* Top bar: Logo + ready badge */}
                      <div className="relative z-10 flex items-start justify-between p-6 pb-0">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={step1Data?.brandName || 'Brand logo'}
                            className="h-10 w-auto object-contain max-w-[140px]"
                            style={{ filter: 'brightness(0) invert(1)' }}
                          />
                        ) : (
                          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
                            {step1Data?.brandName || 'Brand'}
                          </span>
                        )}
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          <span className="text-white text-[10px] font-semibold tracking-wide">Campaign Ready</span>
                        </div>
                      </div>

                      {/* Featured image */}
                      {featuredImageUrl && (
                        <div className="relative z-10 px-6 pt-3">
                          <img
                            src={featuredImageUrl}
                            alt="Featured brand visual"
                            className="w-full h-28 rounded-xl object-cover border border-white/20"
                          />
                        </div>
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Bottom content */}
                      <div className="relative z-10 p-6 pt-0 space-y-3">
                        {/* Organization context pills */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
                          >
                            {organizationLabel}
                          </span>
                          {businessModelLabel && (
                            <span className="text-white/70 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/15">
                              {businessModelLabel}
                            </span>
                          )}
                          {locationLine && (
                            <span className="text-white/50 text-[10px] uppercase tracking-wider">
                              📍 {locationLine}
                            </span>
                          )}
                        </div>

                        {/* Headline — tagline only, sized to fit */}
                        {descriptor && (
                          <p className="text-white/55 text-[10px] uppercase tracking-[0.2em]">
                            {descriptor}
                          </p>
                        )}

                        <h4
                          className="text-white font-black leading-[1.05] uppercase tracking-tight"
                          style={{ fontSize: tagline.length > 30 ? '1.35rem' : tagline.length > 20 ? '1.6rem' : '1.9rem' }}
                        >
                          {tagline}
                        </h4>

                        {/* Short description */}
                        <p className="text-white/60 text-xs leading-snug">
                          {shortDesc}
                        </p>

                        {/* CTA */}
                        <div className="pt-1">
                          <div
                            className="inline-block px-5 py-2 font-black text-xs uppercase tracking-widest rounded-sm"
                            style={{ backgroundColor: accentColor, color: brandColor }}
                          >
                            {ctaLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Info Box */}
              <div className="mx-6 mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-baked-green mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800 leading-relaxed">
                    Completing your brand guide helps BakedBot's AI generate{' '}
                    <strong>sharper</strong> campaigns, website copy, sales enablement, and visuals tailored to
                    your actual business model.
                  </p>
                </div>
              </div>

              {/* Final Action */}
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <Button
                  size="lg"
                  onClick={handleCreateManually}
                  disabled={!step1Data || !step2Data || !step3Data}
                  className="w-full bg-baked-green hover:bg-baked-green/90 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
                >
                  {!step1Data || !step2Data || !step3Data
                    ? 'Complete Steps 1-3 First'
                    : 'Create Brand Guide'}
                </Button>
                <p className="text-xs text-center text-gray-500 mt-3">
                  {step1Data && step2Data && step3Data
                    ? 'All required steps complete ✓'
                    : `${[step1Data, step2Data, step3Data].filter(Boolean).length}/3 required steps done`}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Step Dialogs */}
      <Step1Dialog
        open={currentStep === 1}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        initialData={step1Data || undefined}
        onComplete={(data) => {
          setStep1Data(data);
          // Smart voice defaults based on dispensaryType — only if Step3 not yet filled
          if (!step3Data) {
            const defaults = getVoiceDefaultsForStep1(data);
            if (defaults) {
              setStep3Data({ tone: defaults.tone, personality: defaults.personality, doWrite: [], dontWrite: [] });
            }
          }
          setCurrentStep(null);
        }}
      />
      <Step2Dialog
        open={currentStep === 2}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        initialData={step2Data || undefined}
        onComplete={(data) => {
          setStep2Data(data);
          setCurrentStep(null);
        }}
      />
      <Step3Dialog
        open={currentStep === 3}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        initialData={step3Data || undefined}
        onComplete={(data) => {
          setStep3Data(data);
          setCurrentStep(null);
        }}
      />
      <Step4Dialog
        open={currentStep === 4}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        initialData={step4Data || undefined}
        brandContext={step1Data || undefined}
        onComplete={(data) => {
          setStep4Data(data);
          setCurrentStep(null);
        }}
      />
      <Step5Dialog
        open={currentStep === 5}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        initialData={step5Data || undefined}
        onComplete={(data) => {
          setStep5Data(data);
          setCurrentStep(null);
        }}
      />
      <Step6Dialog
        open={currentStep === 6}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        initialData={step6Data || undefined}
        onComplete={(data) => {
          setStep6Data(data);
          setCurrentStep(null);
        }}
      />
      <Step7Dialog
        open={currentStep === 7}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        initialData={step7Data || undefined}
        onComplete={(data) => {
          setStep7Data(data);
          setCurrentStep(null);
        }}
      />
    </div>
  );
}
