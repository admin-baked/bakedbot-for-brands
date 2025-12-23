'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, LogIn, Mail, CheckCircle, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { completeOnboarding } from './actions';
import { SubmitButton } from './components/submit-button';
import { logger } from '@/lib/logger';
import { searchCannMenusRetailers } from '@/server/actions/cannmenus';
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
import { Label } from '@/components/ui/label';
import { MarketSelector } from '@/components/ui/market-selector';

type BrandResult = {
  id: string;
  name: string;
  market: string | null;
};

type Step = 'role' | 'market' | 'brand-search' | 'manual' | 'integrations' | 'competitors' | 'features' | 'review';

export default function OnboardingPage() {
  const { toast } = useToast();
  const { auth } = useFirebase();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'brand' | 'dispensary' | 'customer' | 'skip' | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedCannMenusEntity, setSelectedCannMenusEntity] = useState<{ id: string, name: string } | null>(null);

  const [features, setFeatures] = useState<{ headless: boolean; budtender: boolean }>({ headless: true, budtender: true });

  const [manualBrandName, setManualBrandName] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualDispensaryName, setManualDispensaryName] = useState('');

  const [posConfig, setPosConfig] = useState<{ provider: 'dutchie' | 'jane' | 'none', apiKey: string, id: string }>({ provider: 'none', apiKey: '', id: '' });

  const [formState, formAction] = useFormState(completeOnboarding, { message: '', error: false });
  const formRef = useRef<HTMLFormElement>(null);

  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [nearbyCompetitors, setNearbyCompetitors] = useState<BrandResult[]>([]);
  const [marketState, setMarketState] = useState<string>('');

  // Handle URL params for pre-filling (e.g. coming from Claim Page)
  const searchParams = useSearchParams();
  useEffect(() => {
    const roleParam = searchParams?.get('role');
    const brandIdParam = searchParams?.get('brandId');
    const brandNameParam = searchParams?.get('brandName');

    // Dispensary params
    const dispensaryIdParam = searchParams?.get('dispensaryId');
    const dispensaryNameParam = searchParams?.get('dispensaryName');

    if (roleParam === 'brand' && brandIdParam && brandNameParam) {
      setRole('brand');
      setSelectedCannMenusEntity({ id: brandIdParam, name: brandNameParam });
      setStep('review'); // Jump to review if we have specific data
      toast({ title: 'Welcome!', description: `Completing setup for ${brandNameParam}.` });
    } else if (roleParam === 'dispensary' && dispensaryNameParam) {
      // Handle dispensary pre-fill (ID is optional/might be "pending")
      setRole('dispensary');
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
        setStep('brand-search');
      }
    }
  }, [searchParams, toast]);

  // Handle successful onboarding redirect
  useEffect(() => {
    if (!formState.error && (formState.message.includes('Onboarding complete') || formState.message.includes('Welcome!'))) {
      // Use a slight delay to allow the success toast to be seen logic if we wanted, but immediate redirect is usually better for "flow"
      // Also ensuring we force refresh tokens so the new claims (role) are respected
      const redirect = async () => {
        if (auth?.currentUser) {
          try {
            await auth.currentUser.getIdToken(true);
          } catch (e) { console.error("Token refresh failed", e); }
        }
        // Onboarding v2: Brand/Dispensary → /dashboard, Customer → /dashboard
        // SuperUser uses separate /super-admin flow
        window.location.assign('/dashboard');
      };
      redirect();
    }
  }, [formState, auth, role]);

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
      console.error(err);
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
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectRole(r: typeof role) {
    setRole(r);
    if (r === 'brand' || r === 'dispensary') {
      // Go to market selection first for brand/dispensary
      setStep('market');
    } else if (r === 'skip') {
      // Just terminate immediately for 'skip'
      window.location.assign('/');
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
        console.warn('Pre-start import failed:', err);
      }
    }

    // V2: Skip integrations/competitors/features - move to Setup Checklist
    // Go directly to review for both Brand and Dispensary
    setStep('review');
  }

  function handleGoToManual() {
    setSelectedCannMenusEntity(null);
    setStep('manual');
  }

  function handleManualContinue() {
    // V2: Go directly to review for all roles
    setStep('review');
  }

  // --- Auth Handlers for "Almost There" Modal ---

  const handleGoogleSignUp = async () => {
    if (!auth) return;
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Success! Close modal and submit form
      setShowSignUpModal(false);
      formRef.current?.requestSubmit();
    } catch (error: any) {
      console.error("Google Sign Up Error:", error);
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
      await createUserWithEmailAndPassword(auth, email, password);
      // Success! Close modal and submit form
      setShowSignUpModal(false);
      formRef.current?.requestSubmit();
    } catch (error: any) {
      console.error("Email Sign Up Error:", error);
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message });
    } finally {
      setAuthLoading(false);
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
    <section className="space-y-4">
      <h2 className="font-semibold text-xl text-center">First, who are you?</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Button variant="outline" className="h-auto text-left p-6 flex-col items-start gap-2 hover:border-primary/50 transition-all shadow-sm" onClick={() => handleSelectRole('brand')}>
          <h3 className="font-bold text-lg">A Brand</h3>
          <p className="text-sm text-muted-foreground">Product manufacturers, growers, & extractors.</p>
        </Button>
        <Button variant="outline" className="h-auto text-left p-6 flex-col items-start gap-2 hover:border-primary/50 transition-all shadow-sm" onClick={() => handleSelectRole('dispensary')}>
          <h3 className="font-bold text-lg">A Dispensary</h3>
          <p className="text-sm text-muted-foreground">Retail locations, delivery services, & storefronts.</p>
        </Button>
        <Button variant="outline" className="h-auto text-left p-6 flex-col items-start gap-2 hover:border-primary/50 transition-all shadow-sm" onClick={() => handleSelectRole('customer')}>
          <h3 className="font-bold text-lg">A Customer</h3>
          <p className="text-sm text-muted-foreground">Looking to shop, browse deals, or find products.</p>
        </Button>
        <Button variant="ghost" className="h-auto text-left p-4 justify-start" onClick={() => handleSelectRole('skip')}>
          <span className="text-muted-foreground">Skip setup for now &rarr;</span>
        </Button>
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
          onClick={() => setStep('brand-search')}
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
        <div className="space-y-2">
          <Label>Dispensary Name</Label>
          <Input name="manualDispensaryName" placeholder="Your Dispensary Name" value={manualDispensaryName} onChange={e => setManualDispensaryName(e.target.value)} />
        </div>
      )}
      <div className="flex gap-2 justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep('brand-search')}>Back</Button>
        <Button onClick={handleManualContinue}>Continue</Button>
      </div>
    </section>
  );

  const renderIntegrationsStep = () => (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Connect your POS</h2>
        <p className="text-sm text-muted-foreground">Select your Point of Sale system to sync inventory in real-time.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={`p-6 border rounded-xl cursor-pointer transition-all ${posConfig.provider === 'dutchie' ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : 'hover:border-primary/50'}`}
          onClick={() => setPosConfig({ ...posConfig, provider: 'dutchie' })}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-bold">Dutchie</span>
          </div>
        </div>

        <div
          className={`p-6 border rounded-xl cursor-pointer transition-all ${posConfig.provider === 'jane' ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : 'hover:border-primary/50'}`}
          onClick={() => setPosConfig({ ...posConfig, provider: 'jane' })}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="font-bold">iHeartJane</span>
          </div>
        </div>

        <div
          className={`p-6 border rounded-xl cursor-pointer transition-all col-span-2 ${posConfig.provider === 'none' ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : 'hover:border-primary/50'}`}
          onClick={() => setPosConfig({ ...posConfig, provider: 'none' })}
        >
          <span className="font-medium text-center block">Skip / No POS</span>
        </div>
      </div>

      {posConfig.provider === 'dutchie' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border animate-in fade-in slide-in-from-top-2">
          <Label>API Key</Label>
          <Input placeholder="Enter Dutchie API Key" value={posConfig.apiKey} onChange={e => setPosConfig({ ...posConfig, apiKey: e.target.value })} type="password" />
        </div>
      )}
      {posConfig.provider === 'jane' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border animate-in fade-in slide-in-from-top-2">
          <Label>Shop ID</Label>
          <Input placeholder="Enter Jane Shop ID" value={posConfig.id} onChange={e => setPosConfig({ ...posConfig, id: e.target.value })} />
        </div>
      )}

      <div className="flex gap-2 justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep('brand-search')}>Back</Button>
        <Button onClick={() => setStep('competitors')}>Continue</Button>
      </div>
    </section>
  );

  const renderCompetitorsStep = () => (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Select your competitors</h2>
        <p className="text-sm text-muted-foreground">Select up to 5 nearby dispensaries you&apos;d like to track.</p>
      </div>

      <div className="grid gap-3">
        {nearbyCompetitors.map((comp) => (
          <div
            key={comp.id}
            className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${selectedCompetitors.includes(comp.id) ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted/50'}`}
            onClick={() => {
              if (selectedCompetitors.includes(comp.id)) {
                setSelectedCompetitors(prev => prev.filter(id => id !== comp.id));
              } else if (selectedCompetitors.length < 5) {
                setSelectedCompetitors(prev => [...prev, comp.id]);
              }
            }}
          >
            <div>
              <h3 className="font-semibold">{comp.name}</h3>
              <p className="text-xs text-muted-foreground">{comp.market}</p>
            </div>
            {selectedCompetitors.includes(comp.id) && <CheckCircle className="h-5 w-5 text-primary" />}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-between pt-4">
        <Button variant="ghost" onClick={() => setStep('integrations')}>Back</Button>
        <Button onClick={() => setStep('features')}>Continue</Button>
      </div>
    </section>
  );

  const renderFeaturesStep = () => (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Choose your features</h2>
        <p className="text-sm text-muted-foreground">Customize your BakedBot experience.</p>
      </div>

      <div className="grid gap-4">
        <div
          className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${features.headless ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted/50'}`}
          onClick={() => setFeatures(prev => ({ ...prev, headless: !prev.headless }))}
        >
          <div>
            <h3 className="font-semibold">Headless Menu</h3>
            <p className="text-xs text-muted-foreground mt-1">SEO-optimized menu for your website.</p>
          </div>
          {features.headless && <CheckCircle className="h-5 w-5 text-primary" />}
        </div>

        <div
          className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${features.budtender ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted/50'}`}
          onClick={() => setFeatures(prev => ({ ...prev, budtender: !prev.budtender }))}
        >
          <div>
            <h3 className="font-semibold">AI Budtender</h3>
            <p className="text-xs text-muted-foreground mt-1">24/7 automated customer support.</p>
          </div>
          {features.budtender && <CheckCircle className="h-5 w-5 text-primary" />}
        </div>
      </div>

      <div className="flex gap-2 justify-between pt-4">
        <Button variant="ghost" onClick={() => (role === 'dispensary' ? setStep('integrations') : setStep('manual'))}>Back</Button>
        <Button onClick={() => setStep('review')}>Review</Button>
      </div>
    </section>
  );

  const renderReviewStep = () => {
    const selectedName =
      (role === 'brand' && manualBrandName) ? manualBrandName :
        (role === 'dispensary' && manualDispensaryName) ? manualDispensaryName :
          selectedCannMenusEntity?.name || 'Default';

    const hasSelection = role === 'brand' || role === 'dispensary';

    return (
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-bold text-2xl">Review & Finish</h2>
          <p className="text-muted-foreground">You're almost there! Confirm your details.</p>
        </div>

        <div className="border rounded-xl p-6 space-y-4 bg-card shadow-sm">
          <div className="flex justify-between items-center py-2 border-b border-dashed">
            <span className="text-muted-foreground">Role</span>
            <span className="font-semibold capitalize bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">{role}</span>
          </div>
          {hasSelection && (
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">{role === 'brand' ? 'Brand Name' : 'Dispensary'}</span>
              <span className="font-semibold">{selectedName}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-t border-dashed">
            <span className="text-muted-foreground">Features</span>
            <div className="text-right text-sm font-medium">
              {features.headless && 'Headless Menu, '}
              {features.budtender && 'AI Budtender'}
            </div>
          </div>
        </div>

        <form action={formAction} ref={formRef} className="flex flex-col gap-4">
          <input type="hidden" name="role" value={role || ''} />
          {role === 'brand' && <input type="hidden" name="brandId" value={selectedCannMenusEntity?.id || ''} />}
          {role === 'brand' && <input type="hidden" name="brandName" value={selectedCannMenusEntity?.name || ''} />}
          {role === 'dispensary' && <input type="hidden" name="locationId" value={selectedCannMenusEntity?.id || ''} />}
          <input type="hidden" name="manualBrandName" value={manualBrandName} />
          <input type="hidden" name="manualProductName" value={manualProductName} />
          <input type="hidden" name="manualDispensaryName" value={manualDispensaryName} />
          <input type="hidden" name="features" value={JSON.stringify(features)} />
          <input type="hidden" name="posProvider" value={posConfig.provider} />
          <input type="hidden" name="posApiKey" value={posConfig.apiKey} />
          <input type="hidden" name="posDispensaryId" value={posConfig.id} />
          <input type="hidden" name="competitors" value={selectedCompetitors.join(',')} />
          <input type="hidden" name="marketState" value={marketState} />

          {/* Intercepted Submit Button */}
          <Button
            className="w-full h-12 text-lg font-bold shadow-md hover:translate-y-[-2px] transition-transform"
            onClick={attemptFinish}
            disabled={!role}
            type="button"
          >
            Complete Setup
          </Button>
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
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
        {step === 'brand-search' && renderSearchStep()}
        {step === 'manual' && renderManualStep()}
        {step === 'integrations' && renderIntegrationsStep()}
        {step === 'competitors' && renderCompetitorsStep()}
        {step === 'features' && renderFeaturesStep()}
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


