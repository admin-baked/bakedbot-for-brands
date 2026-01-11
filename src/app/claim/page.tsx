'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    CheckCircle, Building2, User, Mail, Phone, Loader2, 
    ArrowLeft, ArrowRight, CreditCard, Lock, Search, 
    MapPin, Sparkles, Store, Briefcase 
} from 'lucide-react';
import { PlanSelectionCards } from '@/components/claim/plan-selection-cards';
import { useAcceptJs, formatCardNumber, formatExpiryDate, parseExpirationDate } from '@/hooks/useAcceptJs';
import { PlanId } from '@/lib/plans';
import { MarketSelector } from '@/components/ui/market-selector';
import { searchCannMenusRetailers } from '@/server/actions/cannmenus';
import { useFirebase } from '@/firebase/provider';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ClaimFormData {
    // Step 1: Business Info
    businessName: string;
    businessAddress: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    role: string;
    marketState: string;
    // Step 2: Plan Selection
    planId: PlanId;
    orgId?: string;
}

interface PaymentFormData {
    cardNumber: string;
    expiry: string;
    cvv: string;
    zip: string;
}

type Step = 'role' | 'market' | 'search' | 'auth' | 'details' | 'plan' | 'payment';

function ClaimWizard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { auth } = useFirebase();

    // Steps: role -> market -> search -> auth -> details -> plan -> payment
    const [step, setStep] = useState<Step>('role');
    const [history, setHistory] = useState<Step[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [foundersRemaining, setFoundersRemaining] = useState<number>(247);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);
    
    // Debounce search query to prevent excessive API calls
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Auth State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Accept.js integration
    const { isLoaded: acceptLoaded, isLoading: tokenizing, error: acceptError, tokenizeCard } = useAcceptJs({
        clientKey: process.env.NEXT_PUBLIC_AUTHNET_CLIENT_KEY || '',
        apiLoginId: process.env.NEXT_PUBLIC_AUTHNET_API_LOGIN_ID || ''
    });

    const [formData, setFormData] = useState<ClaimFormData>({
        businessName: '',
        businessAddress: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        role: '',
        marketState: '',
        planId: 'free' // Default to "The Scout"
    });

    const [paymentData, setPaymentData] = useState<PaymentFormData>({
        cardNumber: '',
        expiry: '',
        cvv: '',
        zip: ''
    });

    // Load founders claim count
    useEffect(() => {
        async function loadFoundersCount() {
            try {
                const { getFoundersClaimCount } = await import('@/server/actions/createClaimSubscription');
                const count = await getFoundersClaimCount();
                setFoundersRemaining(Math.max(0, 250 - count));
            } catch (e) { }
        }
        loadFoundersCount();
    }, []);

    // Handle URL Params
    useEffect(() => {
        const name = searchParams?.get('name');
        const orgId = searchParams?.get('orgId');
        const plan = searchParams?.get('plan');
        const roleParam = searchParams?.get('role'); // brand/dispensary

        if (name) setFormData(prev => ({ ...prev, businessName: name }));
        if (plan && plan === 'free') setFormData(prev => ({ ...prev, planId: 'free' }));
        if (roleParam) setFormData(prev => ({ ...prev, role: roleParam }));
    }, [searchParams]);

    // Handle Search Effect
    useEffect(() => {
        const performSearch = async () => {
             if (debouncedSearchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const results = await searchCannMenusRetailers(debouncedSearchQuery);
                const typeFilter = formData.role === 'brand' ? 'brand' : 'dispensary';
                const filtered = results.filter(r => r.type === typeFilter);
                setSearchResults(filtered);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        };

        performSearch();
    }, [debouncedSearchQuery, formData.role]);

    // Navigation Helpers
    const nextStep = (next: Step) => {
        setHistory([...history, step]);
        setStep(next);
    };

    const prevStep = () => {
        const prev = history[history.length - 1];
        if (prev) {
            setHistory(history.slice(0, -1));
            setStep(prev);
        }
    };

    // --- Search Handlers ---
    const handleSearch = (term: string) => {
        setSearchQuery(term);
    };

    const selectEntity = (entity: any) => {
        setFormData(prev => ({
            ...prev,
            businessName: entity.name,
            orgId: entity.id, // This fits into orgId or we might need a separate field if it's a cannmenus ID
            // If it's a CannMenus ID (starts with cm_), we should treat it as a new import potentially
            // relying on createClaimWithSubscription to handle it?
            // Actually, createClaimWithSubscription expects existing orgId in Firestore.
            // If we are claiming a NEW entity found in CannMenus, we might need logic to Create-on-Claim.
            // For now, let's treat it as the name.
        }));
        
        // Trigger background import if possible
        // import('@/app/onboarding/pre-start-import').then(({ preStartDataImport }) => { ... })
        // For simplicity in this iteration, just proceed to Auth.
        
        checkAuthAndProceed();
    };

    const handleManualEntry = () => {
        setManualEntry(true);
        checkAuthAndProceed();
    };

    const checkAuthAndProceed = () => {
        if (auth?.currentUser) {
            // Already logged in, fill contact info if available
            if (auth.currentUser.email) {
                setFormData(prev => ({ ...prev, contactEmail: auth.currentUser!.email! }));
            }
            if (auth.currentUser.displayName) {
                setFormData(prev => ({ ...prev, contactName: auth.currentUser!.displayName! }));
            }
            nextStep('details');
        } else {
            setStep('auth');
        }
    };

    // --- Auth Handlers ---
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

            // Set info
            setFormData(prev => ({
                ...prev,
                contactName: result.user.displayName || '',
                contactEmail: result.user.email || ''
            }));

            nextStep('details');
        } catch (error: any) {
            console.error("Sign Up Error:", error);
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
            
             setFormData(prev => ({
                ...prev,
                contactEmail: result.user.email || ''
            }));

            nextStep('details');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Sign Up Failed", description: error.message });
        } finally {
            setAuthLoading(false);
        }
    };

    // --- Detail & Payment Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        let formattedValue = value;
        if (id === 'cardNumber') formattedValue = formatCardNumber(value);
        else if (id === 'expiry') formattedValue = formatExpiryDate(value);
        else if (id === 'cvv') formattedValue = value.replace(/\D/g, '').substr(0, 4);
        else if (id === 'zip') formattedValue = value.replace(/\D/g, '').substr(0, 5);
        setPaymentData({ ...paymentData, [id]: formattedValue });
    };

    const validateDetails = () => {
        return formData.businessName && formData.contactName &&
            formData.contactEmail && formData.contactPhone;
    };

    const handleSubmit = async () => {
        if (formData.planId !== 'free' && !validatePayment()) {
            setError('Please fill in all payment fields correctly');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let opaqueData = undefined;
            if (formData.planId !== 'free') {
                const expiry = parseExpirationDate(paymentData.expiry);
                if (!expiry) throw new Error('Invalid expiration date');
                opaqueData = await tokenizeCard({
                    cardNumber: paymentData.cardNumber,
                    expirationMonth: expiry.month,
                    expirationYear: expiry.year,
                    cvv: paymentData.cvv
                });
            }

            const { createClaimWithSubscription } = await import('@/server/actions/createClaimSubscription');
            const result = await createClaimWithSubscription({
                ...formData,
                opaqueData,
                zip: paymentData.zip
            });

            if (result.success) {
                const thankYouParams = new URLSearchParams({
                    plan: formData.planId,
                    name: formData.businessName
                });
                router.push(`/thank-you?${thankYouParams.toString()}`);
            } else {
                setError(result.error || 'Failed to submit claim');
            }
        } catch (err: any) {
            setError(acceptError || err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

     const validatePayment = () => {
        if (formData.planId === 'free') return true;
        const expiry = parseExpirationDate(paymentData.expiry);
        return (
            paymentData.cardNumber.replace(/\s/g, '').length >= 15 &&
            expiry !== null &&
            paymentData.cvv.length >= 3 &&
            paymentData.zip.length === 5
        );
    };


    // --- Renderers ---

    return (
        <div className="container max-w-3xl py-12 min-h-screen">
            {/* Steps Progress */}
            {step !== 'role' && step !== 'market' && (
                <div className="mb-8 flex items-center justify-center gap-4">
                     {/* Simplified Progress Bar for later steps */}
                    <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                        {step === 'search' && 'Find Business'}
                        {step === 'auth' && 'Create Account'}
                        {step === 'details' && 'Verify Details'}
                        {step === 'plan' && 'Select Plan'}
                        {step === 'payment' && 'Finalize'}
                    </div>
                </div>
            )}

            {step === 'role' && (
                <div className="space-y-8 max-w-lg mx-auto">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-2">Claim Your Page</h1>
                        <p className="text-muted-foreground">Select your business type to get started</p>
                    </div>
                     <div className="grid gap-4 sm:grid-cols-2">
                        <Button variant="outline" className="h-auto p-6 flex flex-col gap-4 hover:border-primary border-2 border-transparent hover:bg-accent" onClick={() => {
                            setFormData(prev => ({ ...prev, role: 'brand' }));
                            nextStep('market');
                        }}>
                            <Briefcase className="h-10 w-10 text-primary" />
                            <div className="text-left">
                                <h3 className="font-bold">I'm a Brand</h3>
                                <p className="text-sm text-muted-foreground">Growers, processors, manufacturers</p>
                            </div>
                        </Button>
                        <Button variant="outline" className="h-auto p-6 flex flex-col gap-4 hover:border-primary border-2 border-transparent hover:bg-accent" onClick={() => {
                            setFormData(prev => ({ ...prev, role: 'dispensary' }));
                            nextStep('market');
                        }}>
                             <Store className="h-10 w-10 text-primary" />
                             <div className="text-left">
                                <h3 className="font-bold">I'm a Dispensary</h3>
                                <p className="text-sm text-muted-foreground">Retailers, delivery services</p>
                            </div>
                        </Button>
                    </div>
                    <div className="text-center">
                         <Button variant="link" onClick={() => router.push('/')}>Cancel</Button>
                    </div>
                </div>
            )}

            {step === 'market' && (
                <div className="space-y-8 max-w-md mx-auto">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">Where are you located?</h1>
                        <p className="text-muted-foreground">We'll optimize your experience for your market.</p>
                    </div>
                    
                    <MarketSelector 
                        value={formData.marketState}
                        onChange={(val) => setFormData(prev => ({ ...prev, marketState: val }))}
                        label="Primary State"
                        required
                    />

                    <div className="flex justify-between pt-4">
                        <Button variant="ghost" onClick={prevStep}>Back</Button>
                        <Button onClick={() => nextStep('search')} disabled={!formData.marketState}>Continue</Button>
                    </div>
                </div>
            )}

            {step === 'search' && (
                <div className="space-y-6 max-w-lg mx-auto">
                     <div className="text-center">
                        <h1 className="text-2xl font-bold">Find your {formData.role}</h1>
                        <p className="text-muted-foreground">Search our directory to claim your qualified listing.</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input 
                            className="pl-10 h-12 text-lg" 
                            placeholder={`Search ${formData.role} name...`}
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                         {isSearching && <div className="absolute right-3 top-3"><Spinner size="sm" /></div>}
                    </div>

                    <div className="space-y-2">
                        {searchResults.map((result) => (
                             <Button 
                                key={result.id} 
                                variant="outline" 
                                className="w-full justify-start h-auto p-4"
                                onClick={() => selectEntity(result)}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-medium text-lg">{result.name}</span>
                                    <span className="text-xs text-muted-foreground capitalize">{result.type} • {result.id}</span>
                                </div>
                             </Button>
                        ))}
                        
                        {searchQuery.length > 2 && !isSearching && searchResults.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No results found.
                            </div>
                        )}
                    </div>

                    <div className="text-center pt-4">
                         <div className="text-sm text-muted-foreground mb-2">Can't find your business?</div>
                         <Button variant="secondary" onClick={handleManualEntry}>Create New Listing manually</Button>
                    </div>
                     <div className="flex justify-start">
                        <Button variant="ghost" onClick={prevStep}>Back</Button>
                    </div>
                </div>
            )}

            {step === 'auth' && (
                 <div className="space-y-8 max-w-md mx-auto text-center">
                     <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                        <Sparkles className="h-8 w-8 text-primary" />
                     </div>
                     <div>
                        <h1 className="text-2xl font-bold">Create your Account</h1>
                        <p className="text-muted-foreground">
                            Claiming <strong>{formData.businessName || 'your business'}</strong> requires a secure account.
                        </p>
                     </div>

                    <div className="space-y-4">
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

                         <form onSubmit={handleEmailSignUp} className="space-y-3 text-left">
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Password</Label>
                                <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                            <Button className="w-full" type="submit" disabled={authLoading}>Create Account</Button>
                        </form>
                    </div>
                     <Button variant="ghost" onClick={prevStep}>Back</Button>
                 </div>
            )}

            {step === 'details' && (
                <div className="max-w-xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Verify Business Details</CardTitle>
                            <CardDescription>Ensure your listing information is accurate</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid gap-2">
                                <Label htmlFor="businessName">Business Name</Label>
                                <Input id="businessName" value={formData.businessName} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="businessAddress">Address</Label>
                                <Input id="businessAddress" value={formData.businessAddress} onChange={handleChange} placeholder="e.g. 123 Main St" />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="contactName">Your Name</Label>
                                <Input id="contactName" value={formData.contactName} onChange={handleChange} required />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="contactPhone">Phone</Label>
                                <Input id="contactPhone" type="tel" value={formData.contactPhone} onChange={handleChange} required />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>Back</Button>
                            <Button onClick={() => nextStep('plan')} disabled={!validateDetails()}>Continue to Plan</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {step === 'plan' && (
                <div className="max-w-3xl mx-auto">
                    <Card>
                         <CardHeader>
                            <CardTitle>Select a Plan</CardTitle>
                            <CardDescription>Choose the tier that fits your growth goals</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <PlanSelectionCards
                                selectedPlan={formData.planId}
                                onSelectPlan={(id) => setFormData(prev => ({ ...prev, planId: id }))}
                                foundersRemaining={foundersRemaining}
                            />
                        </CardContent>
                         <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>Back</Button>
                            <Button onClick={() => nextStep('payment')}>Continue</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {step === 'payment' && (
                <div className="max-w-xl mx-auto">
                     <Card>
                        <CardHeader>
                            <CardTitle>{formData.planId === 'free' ? 'Confirm Free Listing' : 'Complete Subscription'}</CardTitle>
                            <CardDescription>
                                {formData.planId === 'free' ? 'No credit card required for The Scout plan.' : 'Secure payment via Authorize.net'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Summary */}
                             <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-bold">{formData.businessName}</div>
                                    <div className="text-sm text-muted-foreground">{formData.planId === 'free' ? 'The Scout (Free)' : formData.planId}</div>
                                </div>
                                <div className="text-xl font-bold">
                                    {formData.planId === 'free' ? '$0' : (formData.planId === 'founders_claim' ? '$79' : '$99')}/mo
                                </div>
                            </div>

                            {formData.planId !== 'free' && (
                                <div className="space-y-4">
                                     <div className="grid gap-2">
                                        <Label>Card Number</Label>
                                        <Input id="cardNumber" value={paymentData.cardNumber} onChange={handlePaymentChange} placeholder="0000 0000 0000 0000" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                         <div className="grid gap-2">
                                            <Label>Expiry</Label>
                                            <Input id="expiry" value={paymentData.expiry} onChange={handlePaymentChange} placeholder="MM/YY" />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label>CVV</Label>
                                            <Input id="cvv" value={paymentData.cvv} onChange={handlePaymentChange} placeholder="123" />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label>ZIP</Label>
                                            <Input id="zip" value={paymentData.zip} onChange={handlePaymentChange} placeholder="90210" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && <div className="text-red-500 text-sm">{error}</div>}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                             <Button variant="ghost" onClick={prevStep}>Back</Button>
                             <Button onClick={handleSubmit} disabled={loading} className="w-full md:w-auto">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {formData.planId === 'free' ? 'Confirm & Start' : 'Pay & Subscribe'}
                             </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default function ClaimPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <ClaimWizard />
        </Suspense>
    );
}
