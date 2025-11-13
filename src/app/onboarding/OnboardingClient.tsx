
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type OnboardingStep = 'role' | 'location' | 'products' | 'complete';

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex w-full items-center justify-center gap-2">
        <Progress value={currentStep * 33.33} className="w-full" />
        <span className="text-sm text-muted-foreground">{currentStep} / 3</span>
    </div>
);

export default function OnboardingClient() {
    const { user, isUserLoading } = useUser();
    const firebase = useFirebase();
    const firestore = firebase?.firestore;
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = useState<OnboardingStep>('role');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for user role
    const [role, setRole] = useState<'owner' | 'marketer' | 'customer' | null>(null);

    // State for location
    const [location, setLocation] = useState({ name: '', address: '', city: '', state: '', zip: '' });
    
    const handleNextStep = async () => {
        setIsSubmitting(true);
        if (!user || !firestore) {
            toast({ variant: "destructive", title: "Error", description: "Not authenticated. Please log in again." });
            setIsSubmitting(false);
            return;
        }

        const userDocRef = doc(firestore, "users", user.uid);

        try {
            if (step === 'role') {
                if (!role) {
                    toast({ variant: "destructive", title: "Please select a role" });
                    setIsSubmitting(false);
                    return;
                }
                // setDoc with merge will create or update the user document
                await setDoc(userDocRef, { role: role }, { merge: true });
                if (role === 'customer') {
                    // Customers can skip directly to the end
                    setStep('products');
                } else {
                    setStep('location');
                }
            } else if (step === 'location') {
                 // In a real app, we'd save this location to a 'locations' collection
                console.log("Location data:", location);
                setStep('products');
            } else if (step === 'products') {
                // Final step, mark onboarding as complete
                await setDoc(userDocRef, { onboardingCompleted: true }, { merge: true });
                toast({ title: "Onboarding Complete!", description: "Welcome! You're now being redirected to the dashboard." });
                router.replace('/dashboard');
            }
        } catch (error) {
            console.error("Onboarding error:", error);
            toast({ variant: "destructive", title: "An error occurred", description: "Could not save your information. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/brand-login');
        }
    }, [isUserLoading, user, router]);

    if (isUserLoading || !firestore) {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-lg">
                 <CardHeader>
                    <CardTitle className="text-2xl">Welcome to BakedBot!</CardTitle>
                    <CardDescription>Let's get your account set up in just a few steps.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                   <StepIndicator currentStep={step === 'role' ? 1 : step === 'location' ? 2 : 3} />

                   {step === 'role' && (
                       <div className="space-y-4 animate-in fade-in-50">
                            <h3 className="font-semibold">Step 1: What is your role?</h3>
                            <RadioGroup value={role || ""} onValueChange={(value) => setRole(value as 'owner' | 'marketer' | 'customer')}>
                                <Label htmlFor="owner" className="flex items-start gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                                    <RadioGroupItem value="owner" id="owner" />
                                    <div>
                                        <h4 className="font-semibold">Brand Owner / Manager</h4>
                                        <p className="text-sm text-muted-foreground">I manage a brand and need access to dashboards and content tools.</p>
                                    </div>
                                </Label>
                                <Label htmlFor="marketer" className="flex items-start gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                                    <RadioGroupItem value="marketer" id="marketer" />
                                    <div>
                                        <h4 className="font-semibold">Brand Marketer</h4>
                                        <p className="text-sm text-muted-foreground">I'm focused on creating content and managing product information.</p>
                                    </div>
                                </Label>
                                 <Label htmlFor="customer" className="flex items-start gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                                    <RadioGroupItem value="customer" id="customer" />
                                    <div>
                                        <h4 className="font-semibold">Customer</h4>
                                        <p className="text-sm text-muted-foreground">I'm here to browse products and get recommendations.</p>
                                    </div>
                                </Label>
                            </RadioGroup>
                       </div>
                   )}

                    {step === 'location' && (
                       <div className="space-y-4 animate-in fade-in-50">
                            <h3 className="font-semibold">Step 2: Add your first dispensary location.</h3>
                            <div className="space-y-2">
                                <Label htmlFor="loc-name">Location Name</Label>
                                <Input id="loc-name" placeholder="e.g., Green Leaf Central" value={location.name} onChange={(e) => setLocation({...location, name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="loc-address">Street Address</Label>
                                <Input id="loc-address" placeholder="123 Main St" value={location.address} onChange={(e) => setLocation({...location, address: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Input placeholder="City" value={location.city} onChange={(e) => setLocation({...location, city: e.target.value})} />
                                <Input placeholder="State" value={location.state} onChange={(e) => setLocation({...location, state: e.target.value})} />
                                <Input placeholder="Zip" value={location.zip} onChange={(e) => setLocation({...location, zip: e.target.value})} />
                            </div>
                            <Button variant="link" className="p-0" onClick={() => setStep('products')}>I'll do this later</Button>
                       </div>
                   )}

                   {step === 'products' && (
                       <div className="space-y-4 text-center animate-in fade-in-50">
                            <h3 className="font-semibold">Step 3: All Set!</h3>
                            <p className="text-sm text-muted-foreground">
                                You can manage your brand information, locations, and product catalog in the dashboard settings at any time.
                            </p>
                       </div>
                   )}

                </CardContent>
                <CardFooter>
                    <Button onClick={handleNextStep} disabled={isSubmitting || (step === 'role' && !role)}>
                         {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
                         {step === 'products' ? "Finish & Go to Dashboard" : "Continue"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
