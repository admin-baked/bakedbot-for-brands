
'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { Loader2, PartyPopper, Building, Search } from 'lucide-react';
import { SubmitButton } from './components/submit-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type OnboardingStep = 'role' | 'location' | 'brand-search' | 'done';
type UserRole = 'brand' | 'dispensary' | 'customer';

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
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CannMenusBrand | null>(null);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [brandSearchResults, setBrandSearchResults] = useState<CannMenusBrand[]>([]);
  const [isSearching, startSearchTransition] = useTransition();

  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [formState, formAction] = useFormState(completeOnboarding, initialState);

  const locations = demoRetailers; 
  const areLocationsLoading = false;

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
    if (step === 'role' && selectedRole) {
      if (selectedRole === 'brand') setStep('brand-search');
      else if (selectedRole === 'dispensary') setStep('location');
      else {
        // Customer role can skip to the end
        const formData = new FormData();
        formData.append('role', 'customer');
        formAction(formData);
      }
    } else if (step === 'brand-search' && selectedBrand) {
        const formData = new FormData();
        formData.append('role', 'brand');
        formData.append('brandId', selectedBrand.id);
        formData.append('brandName', selectedBrand.name);
        formAction(formData);
    } else if (step === 'location' && selectedLocationId) {
        const formData = new FormData();
        formData.append('role', 'dispensary');
        formData.append('locationId', selectedLocationId);
        formAction(formData);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'role':
        return (
          <CardContent className="space-y-4" data-testid="onboarding-step-role">
            <h3 className="font-semibold text-lg">First, what is your role?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Brand Owner / Manager', 'Dispensary Manager', 'Customer'].map((role) => (
                <Button key={role} variant={selectedRole === role.split(' ')[0].toLowerCase() ? 'default' : 'outline'} onClick={() => setSelectedRole(role.split(' ')[0].toLowerCase() as UserRole)}>
                  {role}
                </Button>
              ))}
            </div>
          </CardContent>
        );
      case 'brand-search':
        return (
            <CardContent className="space-y-4" data-testid="onboarding-step-brand-search">
                <h3 className="font-semibold text-lg">Claim Your Brand</h3>
                <p className="text-sm text-muted-foreground">Search for your brand in the CannMenus directory to link your account.</p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input 
                        placeholder="Search for your brand..."
                        className="pl-10"
                        value={brandSearchQuery}
                        onChange={e => setBrandSearchQuery(e.target.value)}
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
                            {brand.logoUrl && <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 mr-3 rounded-md object-contain" />}
                            {brand.name}
                        </Button>
                    ))}
                    {!isSearching && brandSearchResults.length === 0 && brandSearchQuery.length > 2 && (
                         <div className="p-4 text-center text-sm text-muted-foreground">No brands found. Try a different search.</div>
                    )}
                    </div>
                </ScrollArea>
            </CardContent>
        );
      case 'location':
        return (
          <CardContent className="space-y-4" data-testid="onboarding-step-location">
            <h3 className="font-semibold text-lg">Which location do you manage?</h3>
             <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Select onValueChange={(value) => setSelectedLocationId(value)}>
                <SelectTrigger className="pl-10">
                    <SelectValue placeholder={areLocationsLoading ? "Loading..." : "Choose your location..."} />
                </SelectTrigger>
                <SelectContent>
                    {locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>
            {selectedLocationId && <p className="text-sm text-muted-foreground">You selected: {locations.find(l => l.id === selectedLocationId)?.name}</p>}
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
      (step === 'brand-search' && !!selectedBrand);

  const isDoneStep = step === 'done';

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
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
                {renderStep()}
                {!isDoneStep && (
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" onClick={handleNext} disabled={!canProceed}>
                           {selectedRole === 'customer' ? 'Finish & Go to Account' : 'Finish & Go to Dashboard'}
                        </Button>
                    </CardFooter>
                )}
            </>
        )}
      </Card>
    </div>
  );
}
