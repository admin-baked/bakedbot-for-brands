
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Building2, User, Mail, Phone, Loader2 } from 'lucide-react';
import { submitClaimRequest, ClaimResult } from '@/server/actions/claims';

export default function ClaimPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ClaimResult | null>(null);
    const [formData, setFormData] = useState({
        businessName: '',
        businessAddress: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        role: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await submitClaimRequest(formData);
        setResult(res);
        setLoading(false);
    };

    if (result?.success) {
        return (
            <div className="container flex min-h-screen flex-col items-center justify-center py-12">
                <Card className="w-full max-w-md animate-in fade-in zoom-in duration-300">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Request Received!</CardTitle>
                        <CardDescription>
                            We've received your claim request for <strong>{formData.businessName}</strong>.
                            Our team will verify your information and get back to you at {formData.contactEmail} within 24-48 hours.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button asChild>
                            <a href="/">Return Home</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl py-12">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight">Claim Your Business on BakedBot</h1>
                <p className="mt-2 text-muted-foreground">
                    Take control of your listing, update your menu in real-time, and reach thousands of local customers.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Business Verification</CardTitle>
                    <CardDescription>
                        Please provide your business details to start the verification process.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="businessName">Dispensary Name</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="businessName"
                                        className="pl-9"
                                        placeholder="e.g. Green Planet Dispensary"
                                        required
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="businessAddress">Address</Label>
                                <Input
                                    id="businessAddress"
                                    placeholder="e.g. 123 Main St, Los Angeles, CA"
                                    required
                                    onChange={handleChange}
                                />
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
                                            className="pl-9"
                                            placeholder="John Doe"
                                            required
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Your Role</Label>
                                    <Input
                                        id="role"
                                        placeholder="e.g. Owner, Manager"
                                        required
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="contactEmail">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="contactEmail"
                                            type="email"
                                            className="pl-9"
                                            placeholder="john@example.com"
                                            required
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="contactPhone">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="contactPhone"
                                            type="tel"
                                            className="pl-9"
                                            placeholder="(555) 123-4567"
                                            required
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {result && !result.success && (
                            <p className="text-sm text-red-500 font-medium">{result.message}</p>
                        )}

                        <Button type="submit" size="lg" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Claim Request'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
