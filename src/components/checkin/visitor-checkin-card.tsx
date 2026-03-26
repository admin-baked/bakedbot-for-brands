'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { captureVisitorCheckin } from '@/server/actions/visitor-checkin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface VisitorCheckinCardProps {
    orgId: string;
    brandName: string;
    brandSlug: string;
    primaryColor: string;
}

interface SubmissionState {
    firstName: string;
    isReturningCustomer: boolean;
    anyMarketingConsent: boolean;
}

function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function VisitorCheckinCard({
    orgId,
    brandName,
    brandSlug,
    primaryColor,
}: VisitorCheckinCardProps) {
    const [firstName, setFirstName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [smsConsent, setSmsConsent] = useState(false);
    const [emailConsent, setEmailConsent] = useState(false);
    const [idChecked, setIdChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submission, setSubmission] = useState<SubmissionState | null>(null);

    const resetMessages = () => {
        setError('');
        setSubmission(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        resetMessages();

        const trimmedFirstName = firstName.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const phoneDigits = phone.replace(/\D/g, '');

        if (!trimmedFirstName) {
            setError('First name is required.');
            return;
        }

        if (phoneDigits.length !== 10) {
            setError('Phone is required.');
            return;
        }

        if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
            setError('Enter a valid email address.');
            return;
        }

        if (emailConsent && !trimmedEmail) {
            setError('Enter your email to receive email updates.');
            return;
        }

        if (!idChecked) {
            setError('Please confirm that a Thrive staff member checked your ID.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await captureVisitorCheckin({
                orgId,
                firstName: trimmedFirstName,
                phone,
                email: trimmedEmail || undefined,
                emailConsent,
                smsConsent,
                source: 'brand_rewards_checkin',
                ageVerifiedMethod: 'staff_attested_public_flow',
            });

            if (!result.success) {
                setError('Check-in is temporarily unavailable. Staff can still let you in.');
                return;
            }

            setSubmission({
                firstName: trimmedFirstName,
                isReturningCustomer: result.isReturningCustomer,
                anyMarketingConsent: smsConsent || emailConsent,
            });
        } catch (_error) {
            setError('Check-in is temporarily unavailable. Staff can still let you in.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section id="check-in" data-brand-slug={brandSlug} className="scroll-mt-24">
            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6 md:p-8">
                    <div className="mb-6 space-y-2">
                        <p
                            className="text-sm font-semibold uppercase tracking-[0.2em]"
                            style={{ color: primaryColor }}
                        >
                            Front Door Check-In
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Check in with BakedBot before you shop at {brandName}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Phone is required. Email is optional. You can opt out anytime.
                        </p>
                    </div>

                    {submission ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                            <p className="text-2xl font-semibold text-foreground">
                                {submission.isReturningCustomer
                                    ? `Welcome back, ${submission.firstName}!`
                                    : `You're checked in, ${submission.firstName}!`}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {submission.anyMarketingConsent
                                    ? 'Your Thrive follow-ups are set.'
                                    : 'You are checked in. Ask staff if you want help joining rewards later.'}
                            </p>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="visitor-checkin-first-name">First name</Label>
                                    <Input
                                        id="visitor-checkin-first-name"
                                        value={firstName}
                                        onChange={(event) => {
                                            resetMessages();
                                            setFirstName(event.target.value);
                                        }}
                                        placeholder="Jane"
                                        autoComplete="given-name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="visitor-checkin-phone">Phone number</Label>
                                    <Input
                                        id="visitor-checkin-phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(event) => {
                                            resetMessages();
                                            setPhone(formatPhone(event.target.value));
                                        }}
                                        placeholder="(315) 555-1212"
                                        inputMode="tel"
                                        autoComplete="tel"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="visitor-checkin-email">Email (optional)</Label>
                                <Input
                                    id="visitor-checkin-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => {
                                        const nextEmail = event.target.value;
                                        resetMessages();
                                        setEmail(nextEmail);
                                        if (!nextEmail.trim()) {
                                            setEmailConsent(false);
                                        }
                                    }}
                                    placeholder="you@example.com"
                                    inputMode="email"
                                    autoComplete="email"
                                />
                            </div>

                            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                                <label className="flex items-start gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={idChecked}
                                        onChange={(event) => {
                                            resetMessages();
                                            setIdChecked(event.target.checked);
                                        }}
                                        className="mt-0.5 h-4 w-4"
                                    />
                                    <span>A Thrive staff member already checked my ID today</span>
                                </label>
                                <label className="flex items-start gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={smsConsent}
                                        onChange={(event) => {
                                            resetMessages();
                                            setSmsConsent(event.target.checked);
                                        }}
                                        className="mt-0.5 h-4 w-4"
                                    />
                                    <span>Text me Thrive updates and offers</span>
                                </label>
                                <label className="flex items-start gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={emailConsent}
                                        onChange={(event) => {
                                            resetMessages();
                                            setEmailConsent(event.target.checked);
                                        }}
                                        className="mt-0.5 h-4 w-4"
                                    />
                                    <span>Email me Thrive updates and offers</span>
                                </label>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="w-full text-base font-semibold"
                                style={{ backgroundColor: primaryColor }}
                                disabled={submitting}
                            >
                                {submitting ? 'Checking In...' : 'Check In With BakedBot'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
