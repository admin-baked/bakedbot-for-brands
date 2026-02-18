'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','ID','IL','IN',
    'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
    'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
    'VT','VA','WA','WV','WI','WY',
];

export default function SocialEquityPage() {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        dispensaryName: '',
        contactName: '',
        contactEmail: '',
        licenseNumber: '',
        licenseType: 'social_equity' as 'social_equity' | 'equity_applicant',
        state: '',
    });
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' });
                return;
            }
            setLicenseFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licenseFile) {
            toast({ title: 'License image required', description: 'Please upload a copy of your license.', variant: 'destructive' });
            return;
        }

        setUploading(true);
        try {
            // Upload license image to Firebase Storage via signed URL
            const uploadFormData = new FormData();
            uploadFormData.append('file', licenseFile);
            uploadFormData.append('folder', 'se_applications');

            const uploadRes = await fetch('/api/upload/license-image', {
                method: 'POST',
                body: uploadFormData,
            });

            if (!uploadRes.ok) throw new Error('Image upload failed');
            const { url: licenseImageUrl } = await uploadRes.json() as { url: string };

            // Submit application
            const res = await fetch('/api/social-equity/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, licenseImageUrl }),
            });

            const data = await res.json() as { success?: boolean; error?: string };

            if (!res.ok) {
                throw new Error(data.error ?? 'Submission failed');
            }

            setSubmitted(true);
        } catch (err) {
            toast({
                title: 'Submission failed',
                description: err instanceof Error ? err.message : 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Application Received</CardTitle>
                        <CardDescription className="text-base mt-2">
                            We'll verify your license and email you within 2–3 business days.
                            Approved applicants receive a permanent 50% discount code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" className="mt-2">
                            <a href="/">Back to Home</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-2xl px-4 py-16">
                {/* Header */}
                <div className="mb-10 space-y-3">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
                        ✊ Social Equity Program
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                        Built for Equity, Priced for Access
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Licensed social equity dispensaries get <strong>50% off any plan — forever.</strong>{' '}
                        Same tools. Same support. Half the price.
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-2 text-sm text-muted-foreground">
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
                            <div className="font-semibold text-foreground">Pro</div>
                            <div className="line-through opacity-60">$99/mo</div>
                            <div className="text-emerald-600 font-bold">$49.50/mo</div>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
                            <div className="font-semibold text-foreground">Growth</div>
                            <div className="line-through opacity-60">$349/mo</div>
                            <div className="text-emerald-600 font-bold">$174.50/mo</div>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
                            <div className="font-semibold text-foreground">Empire</div>
                            <div className="line-through opacity-60">$999/mo</div>
                            <div className="text-emerald-600 font-bold">$499.50/mo</div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Apply for Social Equity Pricing</CardTitle>
                        <CardDescription>
                            We verify your license against state cannabis board records. Manual review takes 2–3 business days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="dispensaryName">Dispensary Name</Label>
                                    <Input
                                        id="dispensaryName"
                                        value={form.dispensaryName}
                                        onChange={(e) => setForm(f => ({ ...f, dispensaryName: e.target.value }))}
                                        placeholder="Green Releaf Chicago"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="contactName">Your Name</Label>
                                    <Input
                                        id="contactName"
                                        value={form.contactName}
                                        onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))}
                                        placeholder="Jane Smith"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="contactEmail">Email Address</Label>
                                <Input
                                    id="contactEmail"
                                    type="email"
                                    value={form.contactEmail}
                                    onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                                    placeholder="jane@dispensary.com"
                                    required
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="licenseNumber">Cannabis License Number</Label>
                                    <Input
                                        id="licenseNumber"
                                        value={form.licenseNumber}
                                        onChange={(e) => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                                        placeholder="IL-SE-2024-000123"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="state">State</Label>
                                    <select
                                        id="state"
                                        value={form.state}
                                        onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value="">Select state</option>
                                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>License Type</Label>
                                <div className="flex gap-4">
                                    {[
                                        { value: 'social_equity', label: 'Social Equity License' },
                                        { value: 'equity_applicant', label: 'Equity Applicant' },
                                    ].map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="licenseType"
                                                value={opt.value}
                                                checked={form.licenseType === opt.value}
                                                onChange={(e) => setForm(f => ({ ...f, licenseType: e.target.value as typeof form.licenseType }))}
                                                className="text-primary"
                                            />
                                            <span className="text-sm">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>License Image</Label>
                                <div
                                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-6 cursor-pointer hover:border-primary/40 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                    {licenseFile ? (
                                        <p className="text-sm font-medium text-foreground">{licenseFile.name}</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Click to upload license image (JPG, PNG, PDF — max 10MB)</p>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={uploading}>
                                {uploading ? 'Submitting…' : 'Submit Application →'}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                We verify license numbers against state cannabis board databases (IL: IDFPR, MI: CRA, CA: DCC).
                                Approved applicants receive a permanent 50% promo code via email.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
