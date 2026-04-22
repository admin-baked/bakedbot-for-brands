'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  LogIn,
  Sparkles,
  CheckCircle,
  Leaf,
  Package,
  Store,
  User,
  QrCode,
  FileSearch,
  Palette,
  Mail,
  Globe,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { completeOnboarding } from './actions';
import { Label } from '@/components/ui/label';
import { MarketSelector } from '@/components/ui/market-selector';
import { searchCannMenusRetailers } from '@/server/actions/cannmenus';
import { WiringScreen } from '@/app/dashboard/settings/link/components/wiring-screen';
import { MenuImportStep } from './components/menu-import-step';
import { checkOnboardingStatus } from './status-action';
import { AnimatePresence } from 'framer-motion';
import { CannMenusAttribution } from '@/components/ui/cannmenus-attribution';
import { useFirebase } from '@/firebase/provider';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { findPricingPlan } from '@/lib/config/pricing';
import { logger } from '@/lib/logger';
import { MCBA_SIGNUP_GRANT_KEY } from '@/lib/constants/mcba-power-hour-ama';
import {
  getDefaultOnboardingPrimaryGoal,
  getOnboardingGoalDefinition,
  ONBOARDING_PRIMARY_GOALS,
} from '@/lib/onboarding/activation';
import type { OnboardingPrimaryGoal } from '@/types/onboarding';

type BrandResult = {
  id: string;
  name: string;
  market: string | null;
};

type OnboardingFormState = {
  message: string;
  error: boolean;
  errors?: Record<string, string[] | undefined>;
};

type Step = 'role' | 'market' | 'brand-search' | 'manual' | 'goal' | 'review' | 'menu-import';

const GOAL_ICON_MAP: Record<OnboardingPrimaryGoal, typeof QrCode> = {
  checkin_tablet: QrCode,
  competitive_intelligence: FileSearch,
  creative_center: Palette,
  welcome_playbook: Mail,
};

export default function OnboardingPage() {
  const { toast } = useToast();
  const { auth } = useFirebase();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'brand' | 'dispensary' | 'customer' | 'skip' | null>(null);
  const [orgSubtype, setOrgSubtype] = useState<'grower' | 'brand' | null>(null);
  const [showWiring, setShowWiring] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedCannMenusEntity, setSelectedCannMenusEntity] = useState<{ id: string, name: string } | null>(null);

  const [manualBrandName, setManualBrandName] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualDispensaryName, setManualDispensaryName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState<OnboardingPrimaryGoal | null>(null);

  // Form State
  const [formState, setFormState] = useState<OnboardingFormState>({ message: '', error: false });
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Auth State
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [marketState, setMarketState] = useState<string>('');

  // Competitor Selection
  const [selectedCompetitors] = useState<any[]>([]);

  // Handle URL params for pre-filling (e.g. coming from Claim Page)
  const searchParams = useSearchParams();
  const selectedPlanId = searchParams?.get('plan')?.trim() || '';
  const signupSource = searchParams?.get('source')?.trim() || '';
  const signupCampaign = searchParams?.get('campaign')?.trim() || '';
  const signupCreditGrantKey = searchParams?.get('grant')?.trim() || '';
  const selectedPlan = selectedPlanId ? findPricingPlan(selectedPlanId) : undefined;
  const selectedPlanLabel = selectedPlan?.name || selectedPlanId;
  const hasMcbaCampaignOffer = signupCreditGrantKey === MCBA_SIGNUP_GRANT_KEY;
  const selectedPlanNeedsConsultation = selectedPlan?.salesMotion === 'consultative';

  useEffect(() => {
    if (!selectedPlanNeedsConsultation || !selectedPlan) return;
    console.info('[OperatorCtaRouting]', {
      planId: selectedPlan.id,
      salesMotion: selectedPlan.salesMotion,
      ctaHref: selectedPlan.ctaHref,
    });
  }, [selectedPlan, selectedPlanNeedsConsultation]);

  useEffect(() => {
    const roleParam = searchParams?.get('role');
    const brandIdParam = searchParams?.get('brandId');
    const brandNameParam = searchParams?.get('brandName');

    // Dispensary params
    const dispensaryIdParam = searchParams?.get('dispensaryId');
    const dispensaryNameParam = searchParams?.get('dispensaryName');

    if (roleParam === 'brand' && brandIdParam && brandNameParam) {
      setRole('brand');
      setPrimaryGoal(getDefaultOnboardingPrimaryGoal('brand'));
      setSelectedCannMenusEntity({ id: brandIdParam, name: brandNameParam });
      setStep('review'); // Jump to review if we have specific data
      toast({ title: 'Welcome!', description: `Completing setup for ${brandNameParam}.` });
    } else if (roleParam === 'dispensary' && dispensaryNameParam) {
      // Handle dispensary pre-fill (ID is optional/might be "pending")
      setRole('dispensary');
      setPrimaryGoal(getDefaultOnboardingPrimaryGoal('dispensary'));
      if (dispensaryIdParam) {
        setSelectedCannMenusEntity({ id: dispensaryIdParam, name: dispensaryNameParam });
      } else {
        // If no ID, it might be manual custom name
        setManualDispensaryName(dispensaryNameParam);
      }
      setStep('review');
      toast({ title: 'Welcome!', description: `Completing setup for ${dispensaryNameParam}.` });
    } else if (roleParam) {
      // Just setting role
      if (roleParam === 'brand' || roleParam === 'dispensary' || roleParam === 'customer') {
        setRole(roleParam as any);
        if (roleParam === 'brand' || roleParam === 'dispensary') {
          setPrimaryGoal(getDefaultOnboardingPrimaryGoal(roleParam));
        }
        setStep(roleParam === 'customer' ? 'review' : 'brand-search');
      }
    }
  }, [searchParams, toast]);

  // Handle successful onboarding redirect
  useEffect(() => {
    if (!formState.error && (formState.message.includes('Onboarding complete') || formState.message.includes('Welcome!'))) {
      if (role === 'skip') {
          window.location.assign('/dashboard');
      } else {
          // Trigger the visual wiring
          setShowWiring(true);
      }
    }
  }, [formState, role]);

  // Handle Session Recovery (for established users)
  const [showReloginModal, setShowReloginModal] = useState(false);

  // If server says "Session expired", show relogin
  useEffect(() => {
    if (formState.error && formState.message.includes('Session expired') && !showReloginModal) {
      setShowReloginModal(true);
    }
  }, [formState, showReloginModal]);

  const handleReLogin = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Re-establish server session
      const idToken = await result.user.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      toast({ title: 'Session Restored', description: 'Please submit again.' });
      setShowReloginModal(false);
    } catch (err) {
      logger.error('Relogin failed', { error: err });
      toast({ variant: 'destructive', title: 'Login Failed', description: 'Please try again.' });
    }
  };

  async function searchCannMenus(term: string) {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchCannMenusRetailers(term);
      const typeFilter = role === 'brand' ? 'brand' : 'dispensary';
      const filtered = data.filter(r => r.type === typeFilter);
      setResults(filtered.map(r => ({ id: r.id, name: r.name, market: 'Global' })));
    } catch (e) {
      logger.error('CannMenus search failed', { error: e });
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectRole(r: typeof role, subtype?: 'grower' | 'brand') {
    setRole(r);
    setOrgSubtype(subtype ?? null);
    if (r === 'brand' || r === 'dispensary') {
      setPrimaryGoal(getDefaultOnboardingPrimaryGoal(r));
    } else if (r === 'customer' || r === 'skip') {
      setPrimaryGoal(null);
    }
    if (r === 'brand' || r === 'dispensary') {
      // Go to market selection first for brand/dispensary
      setStep('market');
    } else if (r === 'skip') {
      // Just terminate immediately for 'skip'
      window.location.assign('/dashboard');
    } else {
      setStep('review');
    }
  }

  async function handleEntitySelect(entity: { id: string, name: string }) {
    setSelectedCannMenusEntity(entity);

    // 🚀 START BACKGROUND IMPORT IMMEDIATELY
    if (role && marketState && entity.id) {
      try {
        const { preStartDataImport } = await import('./pre-start-import');
        const result = await preStartDataImport({
          role: role as 'brand' | 'dispensary',
          entityId: entity.id,
          entityName: entity.name,
          marketState
        });

        if (result.success && result.jobIds.length > 0) {
          toast({
            title: 'Preparing your workspace...',
            description: `Importing ${role === 'brand' ? 'products and partners' : 'menu data'} in the background.`
          });
        }
      } catch (err) {
        // Non-fatal - continue onboarding even if pre-start fails
        logger.warn('Pre-start import failed', { error: err });
      }
    }

    setStep('goal');
  }

  function handleGoToManual() {
    setSelectedCannMenusEntity(null);
    setStep('manual');
  }

  function handleManualContinue() {
    setStep('goal');
  }

  // --- Auth Handlers for "Almost There" Modal ---

  const handleGoogleSignUp = async () => {
    if (!auth) return;
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Create server session
      const idToken = await result.user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      // Success! Close modal and submit form
      setShowSignUpModal(false);
      formRef.current?.requestSubmit();
    } catch (error: any) {
      logger.error('Google Sign Up Error', { error });
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setAuthLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create server session
      const idToken = await result.user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      // Success! Close modal and submit form
      setShowSignUpModal(false);
      formRef.current?.requestSubmit();
    } catch (error: any) {
      logger.error('Email Sign Up Error', { error });
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboardingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingOnboarding) return;

    setIsSubmittingOnboarding(true);
    try {
      const formData = new FormData(event.currentTarget);
      const nextState = await completeOnboarding(formState, formData);
      setFormState(nextState ?? { message: '', error: false });
    } catch (error) {
      logger.error('Onboarding submit failed', { error });
      setFormState({
        message: 'We could not finish setup. Please try again.',
        error: true,
      });
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  const attemptFinish = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop default form submit

    // Check if user is already authenticated
    if (auth?.currentUser) {
      formRef.current?.requestSubmit();
    } else {
      // Trigger the "Almost There" modal
      setShowSignUpModal(true);
    }
  };

  // --- Render Steps ---

  const renderRoleSelection = () => (
    <section className="space-y-5">
      <h2 className="font-semibold text-xl text-center">First, who are you?</h2>
      <div className="grid grid-cols-2 gap-3">
        {/* Grower */}
        <button
          className="text-left p-4 flex flex-col gap-2 border border-border rounded-xl hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all shadow-sm group"
          onClick={() => handleSelectRole('brand', 'grower')}
        >
          <div className="p-2 w-fit bg-muted rounded-lg group-hover:bg-emerald-500/10 transition-colors">
            <Leaf className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Grower</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">Cultivators & farms</div>
          </div>
        </button>

        {/* Brand */}
        <button
          className="text-left p-4 flex flex-col gap-2 border border-border rounded-xl hover:border-purple-500/60 hover:bg-purple-500/5 transition-all shadow-sm group"
          onClick={() => handleSelectRole('brand', 'brand')}
        >
          <div className="p-2 w-fit bg-muted rounded-lg group-hover:bg-purple-500/10 transition-colors">
            <Package className="h-4 w-4 text-muted-foreground group-hover:text-purple-600" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Brand</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">Manufacturers & labs</div>
          </div>
        </button>

        {/* Dispensary */}
        <button
          className="text-left p-4 flex flex-col gap-2 border border-border rounded-xl hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all shadow-sm group"
          onClick={() => handleSelectRole('dispensary')}
        >
          <div className="p-2 w-fit bg-muted rounded-lg group-hover:bg-emerald-500/10 transition-colors">
            <Store className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Dispensary</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">Retail & storefronts</div>
          </div>
        </button>

        {/* Customer */}
        <button
          className="text-left p-4 flex flex-col gap-2 border border-border rounded-xl hover:border-blue-500/60 hover:bg-blue-500/5 transition-all shadow-sm group"
          onClick={() => handleSelectRole('customer')}
        >
          <div className="p-2 w-fit bg-muted rounded-lg group-hover:bg-blue-500/10 transition-colors">
            <User className="h-4 w-4 text-muted-foreground group-hover:text-blue-600" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Customer</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">Shop & browse deals</div>
          </div>
        </button>
      </div>

      <div className="flex justify-center pt-1">
        <button
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => handleSelectRole('skip')}
        >
          Skip setup for now →
        </button>
      </div>
    </section>
  );

  const renderMarketSelection = () => (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-semibold text-xl">Where do you operate?</h2>
        <p className="text-sm text-muted-foreground">
          Select your primary market. We'll auto-import products and dispensaries for this location.
        </p>
      </div>

      <MarketSelector
        value={marketState}
        onChange={setMarketState}
        label="Primary Market"
        description="This helps us find relevant products, dispensaries, and competitors in your area."
        required
      />

      <div className="pt-4 flex justify-between items-center">
        <Button variant="ghost" onClick={() => setStep('role')}>Back</Button>
        <Button
          onClick={() => {
            // For Dispensaries, go to Quick Setup (Menu Import) first
            if (role === 'dispensary') {
              setStep('menu-import');
            } else {
              setStep('brand-search');
            }
          }}
          disabled={!marketState}
        >
          Continue
        </Button>
      </div>
    </section>
  );

  const renderSearchStep = () => (
    <section className="space-y-4">
      <h2 className="font-semibold text-xl">Find your {role}</h2>
      <p className="text-sm text-muted-foreground">
        Start typing your {role} name. We&apos;ll search the directory.
      </p>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.length > 1) searchCannMenus(e.target.value);
              }}
              className="pl-9 h-11"
              placeholder={role === 'brand' ? "e.g., Kiva, Wyld" : "e.g., Green Valley"}
              autoComplete="off"
              autoFocus
            />
          </div>
          {loading && <Button disabled variant="ghost"><Spinner size="sm" /></Button>}
        </div>

        {results.length > 0 && (
          <div className="absolute z-10 w-full bg-popover text-popover-foreground border rounded-md shadow-xl mt-1 max-h-60 overflow-y-auto">
            {results.map((b) => (
              <button
                key={b.id}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 text-sm flex justify-between items-center border-b last:border-0 transition-colors"
                onClick={() => handleEntitySelect({ id: b.id, name: b.name })}
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded border">{b.id.substring(0, 8)}...</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-between items-center">
        <Button variant="ghost" onClick={() => setStep('role')}>Back</Button>
        <Button variant="link" size="sm" onClick={handleGoToManual} className="text-muted-foreground">
          Can&apos;t find it? Add manually.
        </Button>
      </div>
      <div className="flex justify-center pt-2">
        <CannMenusAttribution compact />
      </div>
    </section>
  );

  const renderManualStep = () => (
    <section className="space-y-4">
      <h2 className="font-semibold text-xl">Add your details manually</h2>
      <p className="text-sm text-muted-foreground">We&apos;ll create a new workspace for you.</p>
      {role === 'brand' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input name="manualBrandName" placeholder="e.g. Acme Cannabis" value={manualBrandName} onChange={e => setManualBrandName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Top Product (Optional)</Label>
            <Input name="manualProductName" placeholder="e.g. Blue Dream Pre-roll" value={manualProductName} onChange={e => setManualProductName(e.target.value)} />
          </div>
        </div>
      )}
      {role === 'dispensary' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Dispensary Name</Label>
            <Input name="manualDispensaryName" placeholder="Your Dispensary Name" value={manualDispensaryName} onChange={e => setManualDispensaryName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input name="websiteUrl" placeholder="https://yourdispensary.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} type="url" />
            <p className="text-xs text-muted-foreground">We&apos;ll auto-populate your address, hours, and contact info.</p>
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep('brand-search')}>Back</Button>
        <Button onClick={handleManualContinue}>Continue</Button>
      </div>
    </section>
  );

  const renderGoalStep = () => {
    const recommendedGoal = getDefaultOnboardingPrimaryGoal(role === 'dispensary' ? 'dispensary' : 'brand');
    const previousStep = role === 'dispensary'
      ? (manualDispensaryName ? 'manual' : selectedCannMenusEntity ? 'brand-search' : 'menu-import')
      : (manualBrandName ? 'manual' : 'brand-search');

    return (
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-bold text-2xl">Choose your first win</h2>
          <p className="text-muted-foreground">
            Start with the one outcome you want live first. Brand Guide will come next either way.
          </p>
        </div>

        <div className="space-y-3">
          {ONBOARDING_PRIMARY_GOALS.map((goal) => {
            const Icon = GOAL_ICON_MAP[goal.id];
            const isRecommended = goal.id === recommendedGoal;
            const isSelected = primaryGoal === goal.id;

            return (
              <button
                key={goal.id}
                type="button"
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
                onClick={() => {
                  setPrimaryGoal(goal.id);
                  setStep('review');
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-2 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{goal.title}</p>
                        {isRecommended && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                      <p className="text-xs text-muted-foreground">{goal.audienceLabel}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Start here</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          Start with one live win, then we will help you layer in Brand Guide, email setup, and the rest of the onboarding checklist from inside the dashboard.
        </div>

        <div className="flex justify-between items-center pt-2">
          <Button variant="ghost" onClick={() => setStep(previousStep)}>
            Back
          </Button>
        </div>
      </section>
    );
  };

  const renderMenuImportStep = () => (
    <MenuImportStep
      onComplete={(data) => {
        setManualDispensaryName(data.importedName);
        setSlug(data.slug);
        setZipCode(data.zip);
        setPrimaryGoal(getDefaultOnboardingPrimaryGoal('dispensary'));
        setStep('goal');
      }}
      // If skipped, go to standard search/manual flow
      onSkip={() => setStep('brand-search')}
    />
  );

  const renderReviewStep = () => {
    const selectedName =
      (role === 'brand' && manualBrandName) ? manualBrandName :
        (role === 'dispensary' && manualDispensaryName) ? manualDispensaryName :
          selectedCannMenusEntity?.name || 'Default';

    const hasSelection = role === 'brand' || role === 'dispensary';
    const selectedGoal = primaryGoal ? getOnboardingGoalDefinition(primaryGoal) : null;

    return (
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-bold text-2xl">Review & Finish</h2>
          <p className="text-muted-foreground">You're almost there! Confirm your details.</p>
        </div>

        <div className="border rounded-xl p-6 space-y-4 bg-card shadow-sm">
          <div className="flex justify-between items-center py-2 border-b border-dashed">
            <span className="text-muted-foreground">Role</span>
            <span className="font-semibold capitalize bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">
              {role === 'brand' && orgSubtype === 'grower' ? 'Grower' : role}
            </span>
          </div>
          {hasSelection && (
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">{role === 'brand' ? 'Brand Name' : 'Dispensary'}</span>
              <span className="font-semibold">{selectedName}</span>
            </div>
          )}
          {selectedPlanLabel && (
            <div className="flex justify-between items-center py-2 border-t border-dashed">
              <span className="text-muted-foreground">Selected Plan</span>
              <span className="font-semibold">{selectedPlanLabel}</span>
            </div>
          )}
          {selectedGoal && (
            <div className="flex justify-between items-center py-2 border-t border-dashed">
              <span className="text-muted-foreground">First Win</span>
              <span className="font-semibold">{selectedGoal.title}</span>
            </div>
          )}
          {hasMcbaCampaignOffer && (
            <div className="flex justify-between items-center py-2 border-t border-dashed">
              <span className="text-muted-foreground">Campaign Offer</span>
              <span className="font-semibold">150 free AI credits</span>
            </div>
          )}
        </div>

        {selectedGoal && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">What happens next</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll land in Inbox with a start-here briefing. Begin with Brand Guide, then use{' '}
              <span className="font-medium text-foreground">{selectedGoal.title}</span> as your first live workflow.
            </p>
          </div>
        )}

        {role === 'dispensary' && slug && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Your dispensary pages go live instantly</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Three SEO-ready pages are created for you automatically — no setup required.
            </p>
            <div className="space-y-2">
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-white/60 dark:bg-white/5 px-3 py-2 text-xs hover:border-emerald-500/60 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-3 w-3 text-emerald-600" />
                  <span className="font-medium">Menu & Storefront</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground group-hover:text-emerald-600">
                  <span className="font-mono">/{slug}</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </a>
              {zipCode && (
                <a
                  href={`/zip/${zipCode}-dispensary`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-white/60 dark:bg-white/5 px-3 py-2 text-xs hover:border-emerald-500/60 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-emerald-600" />
                    <span className="font-medium">Local Discovery Page</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground group-hover:text-emerald-600">
                    <span className="font-mono">/zip/{zipCode}-dispensary</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </a>
              )}
              {marketState && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-white/60 dark:bg-white/5 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-emerald-600" />
                    <span className="font-medium">City Guide</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="font-mono">/cities/[city]-cannabis-dispensaries</span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Add your address and hours in Settings → Brand to unlock the full Weedmaps-style info panel.
            </p>
          </div>
        )}

        {selectedPlanNeedsConsultation && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {selectedPlanLabel} is sold through a strategy call.
            </p>
            <p className="text-sm text-muted-foreground">
              Operator and Enterprise plans include launch planning, weekly reporting, KPI reviews, and managed execution. Book Martez to scope the right fit before we create the account.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11">
                <a href="/book/martez">Book Martez</a>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <a href="/pricing">Back to pricing</a>
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleOnboardingSubmit} ref={formRef} className="flex flex-col gap-4">
          <input type="hidden" name="role" value={role || ''} />
          <input type="hidden" name="orgSubtype" value={orgSubtype || ''} />
          <input type="hidden" name="planId" value={selectedPlanId} />
          {role === 'brand' && <input type="hidden" name="brandId" value={selectedCannMenusEntity?.id || ''} />}
          {role === 'brand' && <input type="hidden" name="brandName" value={selectedCannMenusEntity?.name || ''} />}
          {role === 'dispensary' && <input type="hidden" name="locationId" value={selectedCannMenusEntity?.id || ''} />}
          <input type="hidden" name="manualBrandName" value={manualBrandName} />
          <input type="hidden" name="manualProductName" value={manualProductName} />
          <input type="hidden" name="manualDispensaryName" value={manualDispensaryName} />
          <input type="hidden" name="marketState" value={marketState} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="zipCode" value={zipCode} />
          <input type="hidden" name="selectedCompetitors" value={JSON.stringify(selectedCompetitors)} />
          <input type="hidden" name="signupSource" value={signupSource} />
          <input type="hidden" name="signupCampaign" value={signupCampaign} />
          <input type="hidden" name="signupCreditGrantKey" value={signupCreditGrantKey} />
          <input type="hidden" name="primaryGoal" value={primaryGoal || ''} />

          {/* Intercepted Submit Button */}
          {!selectedPlanNeedsConsultation && (
            <Button
              className="w-full h-12 text-lg font-bold shadow-md hover:translate-y-[-2px] transition-transform"
              onClick={attemptFinish}
              disabled={!role || isSubmittingOnboarding}
              type="button"
            >
              {isSubmittingOnboarding ? <Spinner size="sm" /> : 'Complete Setup'}
            </Button>
          )}
        </form>
        {formState.error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
            {formState.message}
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 relative">
      <AnimatePresence>
        {showWiring && (
             <WiringScreen 
                dispensaryName={role === 'brand' ? (manualBrandName || selectedCannMenusEntity?.name || 'Your Brand') : (manualDispensaryName || selectedCannMenusEntity?.name || 'Your Dispensary')}
                role={role === 'brand' ? 'brand' : 'dispensary'}
                checkStatus={checkOnboardingStatus}
                onComplete={() => {
                     // Force token refresh and redirect
                     if (auth?.currentUser) {
                        auth.currentUser.getIdToken(true).then(() => {
                             window.location.assign('/dashboard');
                        });
                     } else {
                         window.location.assign('/dashboard');
                     }
                }}
             />
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg space-y-8 bg-background p-8 rounded-2xl shadow-xl border">
        {step === 'role' && (
          <div className="text-center pb-4">
            <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to BakedBot</h1>
            <p className="text-muted-foreground mt-2">Let&apos;s get your workspace set up in seconds.</p>
          </div>
        )}

        {step === 'role' && renderRoleSelection()}
        {step === 'market' && renderMarketSelection()}
        {step === 'menu-import' && renderMenuImportStep()}
        {step === 'brand-search' && renderSearchStep()}
        {step === 'manual' && renderManualStep()}
        {step === 'goal' && renderGoalStep()}
        {step === 'review' && renderReviewStep()}

        {/* Existing Relogin Modal */}
        <AlertDialog open={showReloginModal} onOpenChange={setShowReloginModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Session Expired</AlertDialogTitle>
              <AlertDialogDescription>
                Your session timed out while you were setting up.
                Please log in again to save your progress and continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button onClick={handleReLogin} className="w-full sm:w-auto">
                <LogIn className="w-4 h-4 mr-2" />
                Log In to Continue
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* NEW: Almost There Signup Modal */}
        <Dialog open={showSignUpModal} onOpenChange={setShowSignUpModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2 w-fit">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold">You're Almost There!</DialogTitle>
              <DialogDescription className="text-center">
                Create your account to save your workspace and complete setup.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Button variant="outline" className="w-full h-12 font-semibold relative" onClick={handleGoogleSignUp} disabled={authLoading}>
                {authLoading ? <Spinner size="sm" /> : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335" /></svg>
                    Sign Up with Google
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or with Email</span></div>
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Create a password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full h-11" type="submit" disabled={authLoading}>
                  {authLoading ? <Spinner size="sm" /> : 'Create Account'}
                </Button>
              </form>
            </div>

            <DialogFooter>
              <p className="text-xs text-center text-muted-foreground w-full">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
