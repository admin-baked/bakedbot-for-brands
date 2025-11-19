
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { demoRetailers } from '@/lib/data';
import DevLoginButton from '@/components/dev-login-button';
import { useFormState } from 'react-dom';
import { completeOnboarding, type OnboardingState } from './actions';
import { Loader2, PartyPopper } from 'lucide-react';
import { SubmitButton } from './components/submit-button';

type OnboardingStep = 'role' | 'location' | 'products' | 'done';
type UserRole = 'brand' | 'dispensary' | 'customer';

const initialState: OnboardingState = {
  message: '',
  error: false,
};


export default function OnboardingClientPage() {
  const [step, setStep] = useState<OnboardingStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

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


  const handleNext = () => {
    if (step === 'role' && selectedRole) {
      if (selectedRole === 'brand' || selectedRole === 'customer') {
        setStep('products');
      } else {
        setStep('location');
      }
    } else if (step === 'location' && selectedLocationId) {
      setStep('products');
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
      case 'location':
        return (
          <CardContent className="space-y-4" data-testid="onboarding-step-location">
            <h3 className="font-semibold text-lg">Which location do you manage?</h3>
            <Select onValueChange={(value) => setSelectedLocationId(value)}>
              <SelectTrigger>
                <SelectValue placeholder={areLocationsLoading ? "Loading..." : "Choose your location..."} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedLocationId && <p className="text-sm text-muted-foreground">You selected: {locations.find(l => l.id === selectedLocationId)?.name}</p>}
          </CardContent>
        );
      case 'products':
         return (
          <CardContent className="text-center" data-testid="onboarding-step-products">
            <h3 className="font-semibold text-lg">You're all set!</h3>
            <p className="text-muted-foreground mt-2">Click the button below to create your account and go to your personalized dashboard.</p>
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
  
  const canProceed = step === 'role' ? !!selectedRole : step === 'location' ? !!selectedLocationId : false;
  const isFinalStep = step === 'products';
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
                 <DevLoginButton />
            </CardContent>
        ) : (
            <form action={formAction}>
                <input type="hidden" name="role" value={selectedRole || ''} />
                <input type="hidden" name="locationId" value={selectedLocationId || ''} />

                {renderStep()}

                {!isDoneStep && (
                    <CardFooter className="flex justify-end gap-2">
                        {!isFinalStep && (
                            <Button type="button" onClick={handleNext} disabled={!canProceed}>Continue</Button>
                        )}
                        {isFinalStep && (
                           <SubmitButton />
                        )}
                    </CardFooter>
                )}
            </form>
        )}
      </Card>
    </div>
  );
}
