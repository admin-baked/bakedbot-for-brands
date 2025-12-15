'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Building2, User, Mail, Globe, Loader2, Phone } from 'lucide-react';
import { submitBrandClaim, SubmitClaimState } from '@/server/actions/brand-claims';

// Initial state for the server action
const initialState: SubmitClaimState = {};

function BrandClaimForm() {
    const searchParams = useSearchParams();
    const [state, formAction] = useFormState(submitBrandClaim, initialState);

    // Controlled state for pre-filling, though FormData handles submission if names are present
    const [formData, setFormData] = useState({
        brandName: '',
        website: '',
        contactName: '',
        businessEmail: '',
        role: '',
        phone: ''
    });

    useEffect(() => {
        const name = searchParams?.get('name');
        if (name) {
            setFormData(prev => ({ ...prev, brandName: name }));
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (state.success) {
        return (
            <div className="container flex min-h-screen flex-col items-center justify-center py-12">
                <Card className="w-full max-w-md animate-in fade-in zoom-in duration-300">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                            <CheckCircle className="h-8 w-8 text-blue-600" />
                        </div>
                        <CardTitle className="text-2xl">Claim Request Received!</CardTitle>
                        <CardDescription>
                            We've received your request to manage <strong>{formData.brandName}</strong>.
                            Our team will verify your brand ownership and email you at {formData.businessEmail}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button asChild>
                            <a href="/">Return to Home</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl py-12">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight">Claim Your Brand Page</h1>
                <p className="mt-2 text-muted-foreground">
                    Get verified, update your products, and measure your foot traffic impact.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Brand Verification</CardTitle>
                    <CardDescription>
                        Provide your details to prove ownership of this brand.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-6">
                        {state.error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                                {state.error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="brandName">Brand Name</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="brandName"
                                        name="brandName"
                                        className="pl-9"
                                        placeholder="e.g. Jeeter"
                                        required
                                        value={formData.brandName}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="website">Official Website</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="website"
                                        name="website"
                                        type="url"
                                        className="pl-9"
                                        placeholder="https://example.com"
                                        required
                                        value={formData.website}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6 space-y-4">
                            <h3 className="font-medium">Contact Information</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="contactName">Your Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="contactName"
                                            name="contactName"
                                            className="pl-9"
                                            placeholder="Jane Doe"
                                            required
                                            value={formData.contactName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Your Role</Label>
                                    <Input
                                        id="role"
                                        name="role"
                                        placeholder="e.g. Founder, Marketing Director"
                                        required
                                        value={formData.role}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="businessEmail">Business Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="businessEmail"
                                        name="businessEmail"
                                        type="email"
                                        className="pl-9"
                                        placeholder="jane@brand.com"
                                        required
                                        value={formData.businessEmail}
                                        onChange={handleChange}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Please use an email address from the brand&apos;s domain.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number (Optional)</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        className="pl-9"
                                        placeholder="(555) 123-4567"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <SubmitButton />
                    </form>
                </CardContent>
                <div className="p-6 pt-0 border-t bg-muted/5">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h4 className="font-semibold text-sm">Want instant access?</h4>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Create a brand account to manage your page immediately.
                            If your email domain matches the brand website, you'll be verified automatically.
                        </p>
                        <Button variant="outline" className="w-full sm:w-auto" asChild>
                            <a href={`/onboarding?role=brand&brandName=${encodeURIComponent(formData.brandName)}&brandId=${searchParams?.get('id') || ''}`}>
                                Create Brand Account
                            </a>
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function SubmitButton() {
    // We use a separate component to use useFormStatus hook if needed, 
    // but we can also just rely on the parent state if we weren't using useFormStatus.
    // However, with useFormState, pending state is best tracked via useFormStatus hook *inside* the form.
    const { pending } = require('react-dom').useFormStatus();

    return (
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                </>
            ) : (
                'Submit Verification Request'
            )}
        </Button>
    );
}

export default function BrandClaimPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <BrandClaimForm />
        </Suspense>
    );
}
