/**
 * Brand Guide Client Component
 *
 * Main client component for brand guide management.
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
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
  Sparkles,
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
} from 'lucide-react';
import type { BrandGuide } from '@/types/brand-guide';
import { VisualIdentityTab } from './components/visual-identity-tab';
import { BrandVoiceTab } from './components/brand-voice-tab';
import { MessagingTab } from './components/messaging-tab';
import { ComplianceTab } from './components/compliance-tab';
import { AssetsTab } from './components/assets-tab';
import { VersionHistoryTab } from './components/version-history-tab';
import { ExportTab } from './components/export-tab';
import { CompetitorAnalysisTab } from './components/competitor-analysis-tab';
import { ABTestingTab } from './components/ab-testing-tab';
import { CreateBrandGuideDialog } from './components/create-brand-guide-dialog';
import {
  Step1Dialog,
  Step2Dialog,
  Step3Dialog,
  Step4Dialog,
} from './components/setup-step-dialogs';
import { extractBrandGuideFromUrl, createBrandGuide } from '@/server/actions/brand-guide';
import { generateBrandImagesForNewAccount } from '@/server/actions/brand-images';
import { useToast } from '@/hooks/use-toast';

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

  // Show create dialog if no brand guide exists
  if (!brandGuide) {
    return <BrandGuideOnboarding brandId={brandId} onComplete={(guide) => setBrandGuide(guide)} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Brand Guide</h1>
        <p className="text-muted-foreground mt-2">
          Manage your brand identity, voice, messaging, and assets
        </p>
      </div>

      {/* Status and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${brandGuide.completenessScore}%` }}
        />
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Messaging
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="abtesting" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export
          </TabsTrigger>
        </TabsList>

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

function BrandGuideOnboarding({ brandId, onComplete }: BrandGuideOnboardingProps) {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  // Collected data from steps
  const [step1Data, setStep1Data] = useState<any>(null);
  const [step2Data, setStep2Data] = useState<any>(null);
  const [step3Data, setStep3Data] = useState<any>(null);
  const [step4Data, setStep4Data] = useState<any>(null);

  const setupSteps = [
    {
      id: 1,
      icon: PenSquare,
      title: 'Write Brand Name & Description',
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
  ];

  const handleScanSite = async () => {
    if (!websiteUrl) return;
    setIsScanning(true);

    try {
      const result = await extractBrandGuideFromUrl({
        url: websiteUrl,
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

      // Step 1 — derive brand name from extracted data, website title, or URL domain
      // Priority: explicit brandName → website page title → URL domain fallback
      const websiteTitle: string | undefined = (result as any).websiteTitle;
      const titleDerivedName = websiteTitle
        ? websiteTitle
            // Strip common suffixes like "| Dispensary" or "- Cannabis"
            .split(/\s*[\|\-–]\s*/)[0]
            .trim()
        : undefined;

      const extractedBrandName: string =
        titleDerivedName ||
        websiteUrl
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .split('.')[0]
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

      // Filter out AI placeholder values that look like "Unknown - ..."
      const cleanTagline = (value: string | undefined): string => {
        if (!value) return '';
        const lower = value.toLowerCase().trim();
        if (
          lower.startsWith('unknown') ||
          lower === 'n/a' ||
          lower === 'not found' ||
          lower === 'not available' ||
          lower.includes('insufficient') ||
          lower.includes('not provided')
        ) {
          return '';
        }
        return value;
      };

      // Only pre-fill if the user hasn't already completed step 1
      if (!step1Data) {
        setStep1Data({
          brandName: extractedBrandName,
          // Fallback chain: valuePropositions[0] → positioning → metadata.description
          description:
            (result as any).messaging?.valuePropositions?.[0] ||
            (result as any).messaging?.positioning ||
            (result as any).metadata?.description ||
            '',
          tagline: cleanTagline((result as any).messaging?.tagline),
        });
      }

      // Step 2 — visual identity + logo preview from OG image / favicon
      if (result.visualIdentity) {
        const detectedLogo = result.visualIdentity.logo?.primary;
        setStep2Data({
          primaryColor: result.visualIdentity.colors?.primary?.hex || '#4ade80',
          secondaryColor: result.visualIdentity.colors?.secondary?.hex,
          logoUrl: detectedLogo,
          logoPreviewUrl: detectedLogo,
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
        description: `Brand data extracted from ${websiteUrl}. Review and confirm the steps below.`,
      });
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Could not scan website',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
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
      // Create brand guide with collected data
      const result = await createBrandGuide({
        brandId,
        brandName: step1Data.brandName,
        method: 'manual',
        initialData: {
          brandName: step1Data.brandName,
          // Location + dispensary type stored as metadata for AI content generation
          ...(step1Data.city || step1Data.state || step1Data.dispensaryType
            ? {
                metadata: {
                  city: step1Data.city,
                  state: step1Data.state,
                  dispensaryType: step1Data.dispensaryType,
                },
              }
            : {}),
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
            logo: step2Data.logoUrl
              ? {
                  primary: step2Data.logoUrl,
                }
              : undefined,
          } as any,
          voice: {
            tone: step3Data.tone,
            personality: step3Data.personality,
            doWrite: step3Data.doWrite,
            dontWrite: step3Data.dontWrite,
          } as any,
          // Messaging from tagline (if provided)
          ...(step1Data.tagline
            ? { messaging: { tagline: step1Data.tagline } as any }
            : {}),
        },
      });

      if (!result.success || !result.brandGuide) {
        throw new Error(result.error || 'Failed to create brand guide');
      }

      onComplete(result.brandGuide);

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
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brand Guide</h1>
          <p className="text-gray-500 mt-1">
            Manage your brand identity, voice, messaging, and visual assets.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
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
                  Fast-track setup by scanning your landing page.
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
                {isScanning ? 'Scanning...' : 'Scan Site'}
              </Button>
            </div>
          </Card>

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
              <div className="p-8">
                {/* Preview Card Graphic */}
                <div className="relative aspect-square w-full bg-slate-900 rounded-xl p-8 flex flex-col justify-end overflow-hidden shadow-2xl">
                  {/* Abstract Background Pattern */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-baked-green rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-[60px] opacity-10" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="w-16 h-4 bg-gray-700 rounded animate-pulse mb-6" />
                    <h4 className="text-white text-3xl font-bold leading-tight uppercase tracking-tighter">
                      {step1Data?.brandName || 'Your Brand'}
                      <br />
                      {step1Data?.tagline || 'Headline Here'}
                    </h4>
                    <p className="text-gray-300 text-lg">
                      {step1Data?.description ||
                        step3Data?.tone?.[0] ||
                        'Your brand voice will appear here.'}
                    </p>
                    <div
                      className="inline-block mt-4 px-6 py-3 font-black text-sm uppercase tracking-widest"
                      style={{
                        backgroundColor: step2Data?.primaryColor || '#ffffff',
                        color: step2Data?.secondaryColor || '#000000',
                      }}
                    >
                      Shop Now
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-baked-green mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800 leading-relaxed">
                      Completing your brand guide helps BakedBot's AI generate{' '}
                      <strong>higher-converting</strong> copy and visuals tailored exactly to
                      your business.
                    </p>
                  </div>
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
          if (!step3Data && data.dispensaryType) {
            const voiceDefaults: Record<string, { tone: string[]; personality: string[] }> = {
              medical: { tone: ['Professional', 'Educational'], personality: ['Trustworthy', 'Empathetic'] },
              recreational: { tone: ['Casual', 'Playful'], personality: ['Friendly', 'Authentic'] },
              both: { tone: ['Professional', 'Casual'], personality: ['Friendly', 'Trustworthy'] },
            };
            const defaults = voiceDefaults[data.dispensaryType];
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
        onComplete={(data) => {
          setStep4Data(data);
          setCurrentStep(null);
        }}
      />
    </div>
  );
}
