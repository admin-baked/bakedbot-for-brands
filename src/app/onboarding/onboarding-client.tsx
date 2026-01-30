'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, LogIn, Sparkles, CheckCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { completeOnboarding } from './actions';
import { Label } from '@/components/ui/label';
import { MarketSelector } from '@/components/ui/market-selector';
import { searchCannMenusRetailers } from '@/server/actions/cannmenus';
import { WiringScreen } from '@/app/dashboard/settings/link/components/wiring-screen';
import { CompetitorOnboardingStep } from './components/competitor-onboarding-step';
import { MenuImportStep } from './components/menu-import-step';
import { checkOnboardingStatus } from './status-action';
import { AnimatePresence } from 'framer-motion';
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

type BrandResult = {
  id: string;
  name: string;
  market: string | null;
};

// V2 Optimization: Re-added 'competitors' for production-ready onboarding
type Step = 'role' | 'market' | 'brand-search' | 'manual' | 'competitors' | 'review' | 'menu-import';

export default function OnboardingPage() {
  const { toast } = useToast();
  const { auth } = useFirebase();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'brand' | 'dispensary' | 'customer' | 'skip' | null>(null);
  const [showWiring, setShowWiring] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedCannMenusEntity, setSelectedCannMenusEntity] = useState<{ id: string, name: string } | null>(null);

  const [manualBrandName, setManualBrandName] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualDispensaryName, setManualDispensaryName] = useState('');
  const [slug, setSlug] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Form State
  const [formState, formAction] = useActionState(completeOnboarding, { message: '', error: false });
  const formRef = useRef<HTMLFormElement>(null);

  // Auth State
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [marketState, setMarketState] = useState<string>('');

  // Competitor Selection
  const [selectedCompetitors, setSelectedCompetitors] = useState<any[]>([]);

  const toggleCompetitor = (comp: any) => {
    setSelectedCompetitors(prev => {
      const exists = prev.find(c => c.id === comp.id);
      if (exists) {
        return prev.filter(c => c.id !== comp.id);
      }
      if (prev.length >= 5) {
        toast({ title: "Limit reached", description: "You can select up to 5 competitors." });
        return prev;
      }
      return [...prev, comp];
    });
  };

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

    // V2 Optimization: Go to competitors step instead of skipping
    setStep('competitors');
  }

  function handleGoToManual() {
    setSelectedCannMenusEntity(null);
    setStep('manual');
  }

  function handleManualContinue() {
    // V2 Optimization: Go to competitors step instead of skipping
    setStep('competitors');
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
    <section className="space-y-6">
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
        <Button variant="outline" className="h-auto text-left p-6 flex-col items-start gap-2 hover:border-primary/50 transition-all shadow-sm sm:col-span-2" onClick={() => handleSelectRole('customer')}>
          <h3 className="font-bold text-lg">A Customer</h3>
          <p className="text-sm text-muted-foreground">Looking to shop, browse deals, or find products.</p>
        </Button>
      </div>
      
      <div className="flex justify-center pt-2">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => handleSelectRole('skip')}>
          Skip setup for now &rarr;
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

  const renderCompetitorsStep = () => (
    <CompetitorOnboardingStep
      role={role as 'brand' | 'dispensary'}
      marketState={marketState}
      selectedCompetitors={selectedCompetitors}
      onToggleCompetitor={toggleCompetitor}
      onBack={() => setStep(selectedCannMenusEntity ? 'brand-search' : 'manual')}
      onContinue={() => setStep('review')}
    />
  );

  const renderMenuImportStep = () => (
    <MenuImportStep
      onComplete={(data) => {
        setManualDispensaryName(data.importedName);
        setSlug(data.slug);
        setZipCode(data.zip);
        setStep('review');
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
        </div>

        <form action={formAction} ref={formRef} className="flex flex-col gap-4">
          <input type="hidden" name="role" value={role || ''} />
          {role === 'brand' && <input type="hidden" name="brandId" value={selectedCannMenusEntity?.id || ''} />}
          {role === 'brand' && <input type="hidden" name="brandName" value={selectedCannMenusEntity?.name || ''} />}
          {role === 'dispensary' && <input type="hidden" name="locationId" value={selectedCannMenusEntity?.id || ''} />}
          <input type="hidden" name="manualBrandName" value={manualBrandName} />
          <input type="hidden" name="manualProductName" value={manualProductName} />
          <input type="hidden" name="manualDispensaryName" value={manualDispensaryName} />
          <input type="hidden" name="manualDispensaryName" value={manualDispensaryName} />
          <input type="hidden" name="marketState" value={marketState} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="zipCode" value={zipCode} />
          <input type="hidden" name="selectedCompetitors" value={JSON.stringify(selectedCompetitors)} />

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
        {step === 'competitors' && renderCompetitorsStep()}
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
