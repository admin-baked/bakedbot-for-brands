
'use client';

import { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { demoRetailers } from '@/lib/demo/demo-data';
import DevLoginButton from '@/components/dev-login-button';
import { useFormState } from 'react-dom';
import { completeOnboarding, type OnboardingState } from './actions';
import { Loader2, PartyPopper, Building, Search, PencilLine } from 'lucide-react';
import { SubmitButton } from './components/submit-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDemoMode } from '@/context/demo-mode';

type OnboardingStep = 'role' | 'location' | 'brand-claim' | 'brand-manual' | 'done';
type UserRole = 'brand' | 'dispensary' | 'customer' | 'skip';
type ClaimMethod = 'claim' | 'manual';

interface CannMenusBrand {
    id: string;
    name: string;
    logoUrl?: string;
}

const initialState: OnboardingState = {
  message: '',
  error: false,
};

const isProd = process.env.NODE_ENV === 'production';

export default function OnboardingClientPage() {
  const [step, setStep] = useState<OnboardingStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [claimMethod, setClaimMethod] = useState<ClaimMethod | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CannMenusBrand | null>(null);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [brandSearchResults, setBrandSearchResults] = useState<CannMenusBrand[]>([]);
  const [isSearching, startSearchTransition] = useTransition();

  const { isDemo } = useDemoMode();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [formState, formAction] = useFormState(completeOnboarding, initialState);
  
  const formRef = useRef<HTMLFormElement>(null);

  // Set initial search query for demo mode
  useEffect(() => {
    if (isDemo) {
        setBrandSearchQuery('40 Tons');
    }
  }, [isDemo]);

  useEffect(() => {
    if (formState.message) {
      if (formState.error) {
        toast({ variant: 'destructive', title: 'Onboarding Failed', description: formState.message });
      } else {
        toast({ title: 'Onboarding Complete!', description: 'Your account is ready.' });
        setStep('done');
      }
    }
  }, [formState, toast, router]);

  useEffect(() => {
    if (brandSearchQuery.length > 2) {
      startSearchTransition(async () => {
        const res = await fetch(`/api/cannmenus/brands?search=${encodeURIComponent(brandSearchQuery)}`);
        if (res.ok) {
          const json = await res.json();
          setBrandSearchResults(json.data?.items || []);
        }
      });
    } else {
      setBrandSearchResults([]);
    }
  }, [brandSearchQuery]);

  const handleNext = () => {
    if (!formRef.current) return;
    
    // Simulate form submission to trigger the server action
    const formData = new FormData(formRef.current);
    if (selectedRole) formData.set('role', selectedRole);
    if (selectedBrand) {
        formData.set('brandId', selectedBrand.id);
        formData.set('brandName', selectedBrand.name);
    }
    if (selectedLocationId) formData.set('locationId', selectedLocationId);

    formAction(formData);
  };
  
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'brand' || role === 'dispensary') {
        // Show choice for brand/dispensary
    } else { // Customer or skip
        const formData = new FormData();
        formData.append('role', role);
        formAction(formData);
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'role':
        return (
          <CardContent className="space-y-4" data-testid="onboarding-step-role">
            <h3 className="font-semibold text-lg">First, what is your role?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant={selectedRole === 'brand' ? 'default' : 'outline'} onClick={() => handleRoleSelect('brand')}>Brand Owner / Manager</Button>
              <Button variant={selectedRole === 'dispensary' ? 'default' : 'outline'} onClick={() => handleRoleSelect('dispensary')}>Dispensary Manager</Button>
              <Button variant={selectedRole === 'customer' ? 'default' : 'outline'} onClick={() => handleRoleSelect('customer')}>Customer</Button>
            </div>
          </CardContent>
        );
      case 'brand-claim':
        return (
            <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">Claim Your Brand</h3>
                <p className="text-sm text-muted-foreground">Search for your brand in the CannMenus directory to link your account.</p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input 
                        placeholder="Search for your brand..."
                        className="pl-10"
                        value={brandSearchQuery}
                        onChange={e => setBrandSearchQuery(e.target.value)}
                        data-ai-hint="search 40 Tons"
                    />
                </div>
                <ScrollArea className="h-60 rounded-md border">
                    <div className="p-2 space-y-1">
                    {isSearching && <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>}
                    {!isSearching && brandSearchResults.map(brand => (
                        <Button
                            key={brand.id}
                            variant={selectedBrand?.id === brand.id ? 'secondary' : 'ghost'}
                            className="w-full justify-start h-auto"
                            onClick={() => setSelectedBrand(brand)}
                        >
                            {brand.logoUrl && <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 mr-3 rounded-md object-contain bg-white p-1" />}
                            {brand.name}
                        </Button>
                    ))}
                    {!isSearching && brandSearchResults.length === 0 && brandSearchQuery.length > 2 && (
                         <div className="p-4 text-center text-sm text-muted-foreground">No brands found. Try manual entry.</div>
                    )}
                    </div>
                </ScrollArea>
            </CardContent>
        );
       case 'brand-manual':
        return (
             <CardContent className="space-y-4">
                <h3 className="font-semibold text-lg">Add Your Brand Details</h3>
                <p className="text-sm text-muted-foreground">Enter your basic info to get started. You can add more later.</p>
                <div className="space-y-2">
                    <Label htmlFor="manualBrandName">Brand Name</Label>
                    <Input name="manualBrandName" id="manualBrandName" placeholder="e.g., Cosmic Cannabis Co." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="manualProductName">First Product Name</Label>
                    <Input name="manualProductName" id="manualProductName" placeholder="e.g., Nebula Nugs" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="manualDispensaryName">First Retail Partner</Label>
                    <Input name="manualDispensaryName" id="manualDispensaryName" placeholder="e.g., The Green Planet" />
                </div>
            </CardContent>
        );
      case 'location':
        return (
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-lg">Which location do you manage?</h3>
             <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Select onValueChange={(value) => setSelectedLocationId(value)} name="locationId">
                <SelectTrigger className="pl-10">
                    <SelectValue placeholder={"Select a location..."} />
                </SelectTrigger>
                <SelectContent>
                    {demoRetailers.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>
            {selectedLocationId && <p className="text-sm text-muted-foreground">You selected: {demoRetailers.find(l => l.id === selectedLocationId)?.name}</p>}
          </CardContent>
        );
      case 'done':
        return (
            <CardContent className="text-center space-y-4">
                <PartyPopper className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="font-semibold text-lg">Setup Complete!</h3>
                <p className="text-muted-foreground">Your account has been configured. Welcome to BakedBot AI.</p>
                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </CardContent>
        )
    }
  };
  
  const canProceed = 
      (step === 'role' && !!selectedRole) ||
      (step === 'location' && !!selectedLocationId) ||
      (step === 'brand-claim' && !!selectedBrand) ||
      step === 'brand-manual';
      
  const isDoneStep = step === 'done';

  const renderRoleChoice = () => (
     <CardContent className="space-y-4">
        <h3 className="font-semibold text-lg">How would you like to add your {selectedRole}?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant={claimMethod === 'claim' ? 'default' : 'outline'} onClick={() => { setClaimMethod('claim'); setStep(selectedRole === 'brand' ? 'brand-claim' : 'location'); }}>
                <Search className="mr-2 h-4 w-4" /> Claim from Directory
            </Button>
             <Button variant={claimMethod === 'manual' ? 'default' : 'outline'} onClick={() => { setClaimMethod('manual'); setStep(selectedRole === 'brand' ? 'brand-manual' : 'location'); }}>
                <PencilLine className="mr-2 h-4 w-4" /> Enter Manually
            </Button>
        </div>
    </CardContent>
  );

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <form ref={formRef} action={handleNext}>
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
            <CardTitle className="text-3xl">Welcome to BakedBot!</CardTitle>
            <CardDescription>Let's get your account set up in just a few steps.</CardDescription>
            </CardHeader>
            
            {isUserLoading ? (
                <CardContent className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                </CardContent>
            ) : !user ? (
                <CardContent className="text-center">
                    <p className="mb-4 text-muted-foreground">Please sign in to continue onboarding.</p>
                    {!isProd && <DevLoginButton />}
                </CardContent>
            ) : (
                <>
                    {step === 'role' && renderStep()}
                    {selectedRole && !claimMethod && step === 'role' && renderRoleChoice()}
                    {(step === 'brand-claim' || step === 'brand-manual' || step === 'location') && renderStep()}
                    {isDoneStep && renderStep()}
                    
                    {!isDoneStep && (
                        <CardFooter className="flex justify-between gap-2">
                             <Button type="button" variant="ghost" onClick={() => formAction(Object.assign(new FormData(), { role: 'skip'}))}>
                                Skip for now
                             </Button>
                            <SubmitButton disabled={!canProceed} />
                        </CardFooter>
                    )}
                </>
            )}
        </Card>
      </form>
    </div>
  );
}
