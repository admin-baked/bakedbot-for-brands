/**
 * Stripe Provider Wrapper
 */

'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface StripeProviderProps {
    clientSecret: string;
    children: React.ReactNode;
}

export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const options = {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
        },
    };

    return (
        <Elements stripe={stripePromise} options={options}>
            {children}
        </Elements>
    );
}
