'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { completeOnboarding } from './actions';
import { SubmitButton } from './components/submit-button';
import { logger } from '@/lib/logger';
import { searchCannMenusRetailers } from '@/server/actions/cannmenus'; // Correct Import
import { useFirebase } from '@/firebase/provider';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogIn } from 'lucide-react';

type BrandResult = {
  id: string;
  name: string;
  market: string | null;
};

type Step = 'role' | 'brand-search' | 'manual' | 'integrations' | 'features' | 'review';

export default function OnboardingPage() {
  const { toast } = useToast();
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

  if (!formState.error && formState.message.includes('Onboarding complete')) {
    if (typeof window !== 'undefined') {
      window.location.assign('/dashboard');
    }
  }

  // Session Recovery Logic
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { auth } = useFirebase();

  // Detect session expiry
  if (formState.error && formState.message.includes('Session expired') && !showLoginModal) {
    setShowLoginModal(true);
  }

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

      toast({ title: 'Session Restored', description: 'You can now continue setup.' });
      setShowLoginModal(false);
      // Optional: Clear form error state if we could, but letting them re-submit is fine.
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
      setStep('brand-search');
    } else {
      setStep('review');
    }
  }

  function handleEntitySelect(entity: { id: string, name: string }) {
    setSelectedCannMenusEntity(entity);
    if (role === 'dispensary') {
      setStep('integrations');
    } else {
      setStep('review');
    }
  }

  function handleGoToManual() {
    setSelectedCannMenusEntity(null);
    setStep('manual');
  }

  function handleManualContinue() {
    if (role === 'dispensary') {
      setStep('integrations');
    } else {
      setStep('review');
    }
  }

  const renderRoleSelection = () => (
    <section className="space-y-4">
      <h2 className="font-semibold text-xl">First, who are you?</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Button variant="outline" className="h-auto text-left p-4 justify-start" onClick={() => handleSelectRole('brand')}>
          <div><h3 className="font-semibold">A Brand</h3><p className="text-xs text-muted-foreground">e.g., a product manufacturer.</p></div>
        </Button>
        <Button variant="outline" className="h-auto text-left p-4 justify-start" onClick={() => handleSelectRole('dispensary')}>
          <div><h3 className="font-semibold">A Dispensary</h3><p className="text-xs text-muted-foreground">e.g., a retail location.</p></div>
        </Button>
        <Button variant="outline" className="h-auto text-left p-4 justify-start" onClick={() => handleSelectRole('customer')}>
          <div><h3 className="font-semibold">A Customer</h3><p className="text-xs text-muted-foreground">I just want to shop.</p></div>
        </Button>
        <Button variant="outline" className="h-auto text-left p-4 justify-start" onClick={() => handleSelectRole('skip')}>
          <div><h3 className="font-semibold">Just Exploring</h3><p className="text-xs text-muted-foreground">Skip setup for now.</p></div>
        </Button>
      </div>
    </section>
  );

  const renderSearchStep = () => (
    <section className="space-y-4">
      <h2 className="font-semibold text-xl">Find your {role}</h2>
      <p className="text-sm text-muted-foreground">
        Start typing your {role} name. We&apos;ll search the CannMenus directory.
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
              className="pl-9"
              placeholder={role === 'brand' ? "e.g., Kiva, Wyld" : "e.g., Green Valley"}
              autoComplete="off"
            />
          </div>
          {loading && <Button disabled variant="ghost"><Loader2 className="animate-spin" /></Button>}
        </div>

        {results.length > 0 && (
          <div className="absolute z-10 w-full bg-popover text-popover-foreground border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
            {results.map((b) => (
              <button
                key={b.id}
                className="w-full text-left px-4 py-3 hover:bg-accent hover:text-accent-foreground text-sm flex justify-between items-center border-b last:border-0"
                onClick={() => handleEntitySelect({ id: b.id, name: b.name })}
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{b.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button variant="link" size="sm" onClick={handleGoToManual} className="pl-0 text-muted-foreground">
          Can&apos;t find your {role}? Add it manually.
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
          <Input name="manualBrandName" placeholder="Your Brand Name" value={manualBrandName} onChange={e => setManualBrandName(e.target.value)} />
          <Input name="manualProductName" placeholder="A best-selling product (optional)" value={manualProductName} onChange={e => setManualProductName(e.target.value)} />
          <Input name="manualDispensaryName" placeholder="A dispensary that carries you (optional)" value={manualDispensaryName} onChange={e => setManualDispensaryName(e.target.value)} />
        </div>
      )}
      {role === 'dispensary' && (
        <Input name="manualDispensaryName" placeholder="Your Dispensary Name" value={manualDispensaryName} onChange={e => setManualDispensaryName(e.target.value)} />
      )}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setStep('brand-search')}>Back to search</Button>
        <Button onClick={handleManualContinue}>Continue</Button>
      </div>
    </section>
  );

  const renderIntegrationsStep = () => (
    <section className="space-y-4">
      <h2 className="font-semibold text-xl">Connect your POS</h2>
      <p className="text-sm text-muted-foreground">Select your Point of Sale system to sync inventory in real-time.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={`p-4 border rounded-lg cursor-pointer transition-colors ${posConfig.provider === 'dutchie' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
          onClick={() => setPosConfig({ ...posConfig, provider: 'dutchie' })}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="font-semibold">Dutchie</span>
          </div>
        </div>

        <div
          className={`p-4 border rounded-lg cursor-pointer transition-colors ${posConfig.provider === 'jane' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
          onClick={() => setPosConfig({ ...posConfig, provider: 'jane' })}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="font-semibold">iHeartJane</span>
          </div>
        </div>

        <div
          className={`p-4 border rounded-lg cursor-pointer transition-colors ${posConfig.provider === 'none' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
          onClick={() => setPosConfig({ ...posConfig, provider: 'none' })}
        >
          <span className="font-semibold block mb-1">Skip / No POS</span>
        </div>
      </div>

      {posConfig.provider === 'dutchie' && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border mt-4">
          <Input placeholder="Dutchie API Key" value={posConfig.apiKey} onChange={e => setPosConfig({ ...posConfig, apiKey: e.target.value })} type="password" />
        </div>
      )}
      {posConfig.provider === 'jane' && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border mt-4">
          <Input placeholder="Jane Shop ID" value={posConfig.id} onChange={e => setPosConfig({ ...posConfig, id: e.target.value })} />
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setStep('brand-search')}>Back</Button>
        <Button onClick={() => setStep('features')}>Continue</Button>
      </div>
    </section>
  );

  const renderFeaturesStep = () => (
    <section className="space-y-4">
      <h2 className="font-semibold text-xl">Choose your features</h2>
      <div className="grid gap-4">
        <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${features.headless ? 'bg-green-50 border-green-200' : 'hover:bg-muted'}`} onClick={() => setFeatures(prev => ({ ...prev, headless: !prev.headless }))}>
          <h3 className="font-semibold">Headless Menu</h3>
        </div>
        <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${features.budtender ? 'bg-green-50 border-green-200' : 'hover:bg-muted'}`} onClick={() => setFeatures(prev => ({ ...prev, budtender: !prev.budtender }))}>
          <h3 className="font-semibold">AI Budtender</h3>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setStep('brand-search')}>Back</Button>
        <Button onClick={() => setStep('review')}>Continue</Button>
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
      <section className="space-y-4">
        <h2 className="font-semibold text-xl">Review &amp; Finish</h2>
        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Role:</span><span className="font-semibold capitalize">{role}</span></div>
          {hasSelection && (
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{role === 'brand' ? 'Brand' : 'Dispensary'}:</span><span className="font-semibold">{selectedName}</span></div>
          )}
        </div>
        <form action={formAction} className="flex items-center gap-2">
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

          <SubmitButton disabled={!role} />
        </form>
        {formState.error && <p className="text-sm text-destructive">{formState.message}</p>}
      </section>
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to BakedBot AI</h1>
          <p className="text-muted-foreground">Let&apos;s get your workspace set up.</p>
        </div>
        {step === 'role' && renderRoleSelection()}
        {step === 'brand-search' && renderSearchStep()}
        {step === 'manual' && renderManualStep()}
        {step === 'integrations' && renderIntegrationsStep()}
        {step === 'features' && renderFeaturesStep()}
        {step === 'review' && renderReviewStep()}

        <AlertDialog open={showLoginModal} onOpenChange={setShowLoginModal}>
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
      </div>
    </main>
  );
}
