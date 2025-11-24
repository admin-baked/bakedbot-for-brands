
// src/app/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { completeOnboarding } from './actions';
import { SubmitButton } from './components/submit-button';

type BrandResult = {
  id: string;
  name: string;
  market: string | null;
};

type Step = 'role' | 'brand-search' | 'manual' | 'review';

export default function OnboardingPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'brand' | 'dispensary' | 'customer' | 'skip' | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedCannMenusEntity, setSelectedCannMenusEntity] = useState<{ id: string, name: string } | null>(null);
  
  const [manualBrandName, setManualBrandName] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualDispensaryName, setManualDispensaryName] = useState('');

  const [formState, formAction] = useFormState(completeOnboarding, { message: '', error: false });
  
  if (!formState.error && formState.message === 'Onboarding complete!') {
      // This is a client-side redirect after a successful server action.
      // In a real app, this might be a router.push('/dashboard'), but for now, a reload is fine.
      if (typeof window !== 'undefined') {
          window.location.assign('/dashboard');
      }
  }
  
  async function searchCannMenus(term: string) {
    setLoading(true);
    try {
      const resp = await fetch(`/api/cannmenus/${role === 'brand' ? 'brands' : 'retailers'}?search=${encodeURIComponent(term)}`);
      const json = await resp.json();
      setResults(json.data?.data || []);
    } catch (e) {
      console.error('Search failed', e);
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
    setStep('review');
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
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') searchCannMenus(query); }}
          placeholder={role === 'brand' ? "e.g., 40 Tons" : "e.g., Bayside Cannabis"}
        />
        <Button onClick={() => searchCannMenus(query)} disabled={!query.trim() || loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
        </Button>
      </div>
      <div className="space-y-2">
        {results.map((b) => (
          <Button key={b.id} variant="ghost" className="w-full justify-between" onClick={() => handleEntitySelect({ id: b.id, name: b.name })}>
            <span>{b.name}</span>
            <span className="text-xs text-muted-foreground">{b.market}</span>
          </Button>
        ))}
         <Button variant="link" size="sm" onClick={() => setStep('manual')}>
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
          <Button onClick={() => setStep('review')}>Continue</Button>
      </div>
    </section>
  );

  const renderReviewStep = () => {
    const selectedName = selectedCannMenusEntity?.name || manualBrandName || manualDispensaryName || (role === 'customer' || role === 'skip' ? 'Default' : 'N/A');
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
        <p className="text-xs text-muted-foreground">This will configure your user account and workspace.</p>
        <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="role" value={role || ''} />
            {role === 'brand' && <input type="hidden" name="brandId" value={selectedCannMenusEntity?.id || ''} />}
            {role === 'brand' && <input type="hidden" name="brandName" value={selectedCannMenusEntity?.name || ''} />}
            {role === 'dispensary' && <input type="hidden" name="locationId" value={selectedCannMenusEntity?.id || ''} />}
            
             {/* Pass manual entries */}
            <input type="hidden" name="manualBrandName" value={manualBrandName} />
            <input type="hidden" name="manualProductName" value={manualProductName} />
            <input type="hidden" name="manualDispensaryName" value={manualDispensaryName} />

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
        {step === 'review' && renderReviewStep()}
      </div>
    </main>
  );
}
