'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMenuData } from '@/hooks/use-menu-data';
import type { Retailer } from '@/types/domain';

type OnboardingStep = 'role' | 'location' | 'products' | 'done';
type UserRole = 'brand' | 'dispensary' | 'customer';

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Retailer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const { locations, isLoading: areLocationsLoading } = useMenuData();

  const handleNext = () => {
    if (step === 'role' && selectedRole) {
      if (selectedRole === 'brand' || selectedRole === 'customer') {
        // Brands and Customers can skip location selection if they want,
        // but let's take them to the final step to confirm.
        setStep('products');
      } else {
        setStep('location');
      }
    } else if (step === 'location' && selectedLocation) {
      setStep('products');
    }
  };

  const handleFinish = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'User or database not available.' });
        return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const userProfileData = {
        email: user.email,
        displayName: user.displayName,
        role: selectedRole,
        brandId: selectedRole === 'brand' ? 'default' : null, // Hard-coding brandId for now
        locationId: selectedLocation?.id || null
    };

    try {
        await setDoc(userDocRef, userProfileData, { merge: true });
        setStep('done');
        // The Cloud Function will handle setting claims. After a short delay
        // to allow claims to propagate, we redirect.
        toast({ title: 'Onboarding Complete!', description: 'Redirecting you to your dashboard...' });
        setTimeout(() => {
            router.push('/dashboard');
        }, 2000); 
    } catch (error) {
        console.error('Failed to save user profile:', error);
        toast({ variant: 'destructive', title: 'Failed to save profile', description: 'Could not complete onboarding. Please try again.' });
        setIsSubmitting(false);
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
            <Select onValueChange={(value) => setSelectedLocation(locations.find(l => l.id === value) || null)}>
              <SelectTrigger>
                <SelectValue placeholder={areLocationsLoading ? "Loading..." : "Choose your location..."} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedLocation && <p className="text-sm text-muted-foreground">You selected: {selectedLocation.name}</p>}
          </CardContent>
        );
      case 'products':
         return (
          <CardContent className="text-center" data-testid="onboarding-step-products">
            <h3 className="font-semibold text-lg">You're all set!</h3>
            <p className="text-muted-foreground mt-2">We're ready to create your personalized dashboard.</p>
          </CardContent>
        );
      case 'done':
        return (
            <CardContent className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="font-semibold text-lg">Finalizing your setup...</h3>
                <p className="text-muted-foreground mt-2">Please wait while we redirect you.</p>
            </CardContent>
        )
    }
  };
  
  const canProceed = step === 'role' ? !!selectedRole : step === 'location' ? !!selectedLocation : false;

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome to BakedBot!</CardTitle>
          <CardDescription>Let's get your account set up in just a few steps.</CardDescription>
        </CardHeader>
        {renderStep()}
        <CardFooter className="flex justify-end gap-2">
            {step !== 'products' && step !== 'done' && (
                <Button onClick={handleNext} disabled={!canProceed}>Continue</Button>
            )}
            {step === 'products' && (
                <Button onClick={handleFinish} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Finish & Go to Dashboard
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
