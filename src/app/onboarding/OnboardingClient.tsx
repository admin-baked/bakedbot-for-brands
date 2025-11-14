
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
import { useMenuData } from '@/hooks/use-menu-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    const { locations: allLocations, isLoading: areLocationsLoading } = useMenuData();

    const [step, setStep] = useState<OnboardingStep>('role');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for user role
    const [role, setRole] = useState<'owner' | 'dispensary' | 'customer' | null>(null);

    // State for location step
    const [locationView, setLocationView] = useState<'claim' | 'create'>('claim');
    const [claimedLocationId, setClaimedLocationId] = useState<string | null>(null);
    const [newLocation, setNewLocation] = useState({ name: '', address: '', city: '', state: '', zip: '' });
    
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
                await setDoc(userDocRef, { role: role, email: user.email }, { merge: true });
                
                if (role === 'customer') {
                    setStep('products');
                } else {
                    setStep('location');
                }
            } else if (step === 'location') {
                 let locationIdToSave: string | null = null;
                 if (locationView === 'claim') {
                    if (!claimedLocationId) {
                         toast({ variant: "destructive", title: "Please claim a location or create a new one." });
                         setIsSubmitting(false);
                         return;
                    }
                    locationIdToSave = claimedLocationId;
                 } else {
                    // In a real app, we'd save this new location to a 'dispensaries' collection
                    // and get its new ID. For this demo, we'll just log it and use a placeholder ID.
                    console.log("Creating new location:", newLocation);
                    toast({ title: "New Location Created (Simulated)", description: "In a real app, this would be saved to the database." });
                    locationIdToSave = `new-${Date.now()}`;
                 }
                
                 await setDoc(userDocRef, { locationId: locationIdToSave }, { merge: true });
                 setStep('products');

            } else if (step === 'products') {
                await setDoc(userDocRef, { onboardingCompleted: true }, { merge: true });
                toast({ title: "Onboarding Complete!", description: "Welcome! You're now being redirected." });

                // Redirect based on role after onboarding is fully complete
                if (role === 'dispensary') {
                    router.replace('/dashboard/orders');
                } else {
                    router.replace('/dashboard');
                }
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
                            <RadioGroup value={role || ""} onValueChange={(value) => setRole(value as 'owner' | 'dispensary' | 'customer')}>
                                <Label htmlFor="owner" className="flex items-start gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                                    <RadioGroupItem value="owner" id="owner" />
                                    <div>
                                        <h4 className="font-semibold">Brand Owner / Manager</h4>
                                        <p className="text-sm text-muted-foreground">I manage a brand and need access to dashboards and content tools.</p>
                                    </div>
                                </Label>
                                <Label htmlFor="dispensary" className="flex items-start gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                                    <RadioGroupItem value="dispensary" id="dispensary" />
                                    <div>
                                        <h4 className="font-semibold">Dispensary Owner / Manager</h4>
                                        <p className="text-sm text-muted-foreground">I'm responsible for fulfilling orders at a dispensary.</p>
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
                            <h3 className="font-semibold">Step 2: Link Your Dispensary</h3>
                            
                            <RadioGroup value={locationView} onValueChange={(v) => setLocationView(v as 'claim' | 'create')} className="grid grid-cols-2">
                                <Label htmlFor="claim" className="flex items-center justify-center rounded-l-md border py-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                                    <RadioGroupItem value="claim" id="claim" className="sr-only" />
                                    Claim Location
                                </Label>
                                 <Label htmlFor="create" className="flex items-center justify-center rounded-r-md border py-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                                    <RadioGroupItem value="create" id="create" className="sr-only" />
                                    Create New
                                </Label>
                            </RadioGroup>

                            {locationView === 'claim' && (
                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="location-select">Select Your Dispensary</Label>
                                    <Select onValueChange={setClaimedLocationId} disabled={areLocationsLoading}>
                                        <SelectTrigger id="location-select">
                                            <SelectValue placeholder={areLocationsLoading ? "Loading..." : "Choose your location..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allLocations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.id}>{loc.name} - {loc.city}, {loc.state}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Select your dispensary from the list of locations created by our brand partners.</p>
                                </div>
                            )}
                             
                            {locationView === 'create' && (
                               <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="loc-name">Location Name</Label>
                                        <Input id="loc-name" placeholder="e.g., Green Leaf Central" value={newLocation.name} onChange={(e) => setNewLocation({...newLocation, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="loc-address">Street Address</Label>
                                        <Input id="loc-address" placeholder="123 Main St" value={newLocation.address} onChange={(e) => setNewLocation({...newLocation, address: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input placeholder="City" value={newLocation.city} onChange={(e) => setNewLocation({...newLocation, city: e.target.value})} />
                                        <Input placeholder="State" value={newLocation.state} onChange={(e) => setNewLocation({...newLocation, state: e.target.value})} />
                                        <Input placeholder="Zip" value={newLocation.zip} onChange={(e) => setNewLocation({...newLocation, zip: e.target.value})} />
                                    </div>
                               </div>
                            )}

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
                <CardFooter className="justify-between">
                     <Button variant="ghost" onClick={() => role === 'dispensary' ? setStep('role') : {}} disabled={step === 'role'}>
                        Back
                    </Button>
                    <Button onClick={handleNextStep} disabled={isSubmitting || (step === 'role' && !role)}>
                         {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
                         {step === 'products' ? "Finish & Go to Dashboard" : "Continue"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
