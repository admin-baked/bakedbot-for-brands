'use client';

/**
 * IncomingVisitNotification
 *
 * Listens in real-time to `visit_sessions` (status = 'opened') for the current
 * user's org. When a new customer checks in on the loyalty tablet, this shows an
 * intrusive slide-up overlay for every back-office user logged into the dashboard.
 *
 * Features:
 *  - Firestore onSnapshot on visit_sessions (same pattern as dispensary orders page)
 *  - Only triggers on truly NEW sessions (tracks seen session IDs)
 *  - Plays a subtle chime via Web Audio API (no asset files needed)
 *  - "Serve Now" → marks session as 'recognized' via server action
 *  - "Dismiss" → hides notification, marks session seen
 *  - Auto-dismisses after 45s if no action taken
 *  - Shows customer name, mood emoji, cart items, queue position
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { markSessionRecognized } from '@/server/actions/staff/loyalty';
import { logger } from '@/lib/logger';
import type { VisitSession } from '@/types/club';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, CheckCircle, User, Sparkles } from 'lucide-react';

// Mood → emoji map (mirrors loyalty-tablet shared)
const MOOD_EMOJI: Record<string, string> = {
    relaxed: '😌',
    energized: '⚡',
    creative: '🎨',
    social: '🎉',
    focused: '🎯',
    sleepy: '😴',
    pain_relief: '💊',
    appetite: '🍕',
};

function playChime() {
    try {
        const ctx = new AudioContext();
        const times = [0, 0.15, 0.30];
        const freqs = [880, 1100, 1320];
        times.forEach((t, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freqs[i];
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.4);
        });
    } catch {
        // Web Audio not available — silent fallback
    }
}

interface NotificationState {
    session: VisitSession & { memberName?: string };
    queuePosition: number;
    autoDismissAt: number;
}

export function IncomingVisitNotification() {
    const { user } = useAuth();
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [serving, setServing] = useState(false);
    const seenIds = useRef<Set<string>>(new Set());
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismiss = useCallback(() => {
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        setNotification(null);
        setServing(false);
    }, []);

    const handleServeNow = useCallback(async (sessionId: string) => {
        setServing(true);
        try {
            await markSessionRecognized(sessionId, user?.uid);
        } catch (err) {
            logger.warn('[IncomingVisitNotification] markSessionRecognized failed', { err });
        }
        dismiss();
    }, [user?.uid, dismiss]);

    useEffect(() => {
        if (!user) return;

        let orgId: string | null = null;
        let unsubscribe: (() => void) | null = null;

        const setup = async () => {
            try {
                const tokenResult = await user.getIdTokenResult();
                const claims = tokenResult.claims as Record<string, unknown>;
                const claimStr = (k: string) => (typeof claims[k] === 'string' ? (claims[k] as string) : null);
                orgId = claimStr('orgId') || claimStr('currentOrgId') || claimStr('locationId') || claimStr('brandId');

                // Super users can see all orgs — limit to most recent 20 sessions globally
                const { firestore } = initializeFirebase();

                const q = orgId
                    ? query(
                        collection(firestore, 'visit_sessions'),
                        where('organizationId', '==', orgId),
                        where('status', '==', 'opened'),
                        orderBy('openedAt', 'desc'),
                        limit(10)
                    )
                    : query(
                        collection(firestore, 'visit_sessions'),
                        where('status', '==', 'opened'),
                        orderBy('openedAt', 'desc'),
                        limit(20)
                    );

                let initialLoad = true;
                let queueCount = 0;

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const sessions = snapshot.docs.map(d => d.data() as VisitSession);
                    queueCount = sessions.length;

                    if (initialLoad) {
                        // Seed seen IDs from the initial load — don't notify on page load
                        sessions.forEach(s => seenIds.current.add(s.id));
                        initialLoad = false;
                        return;
                    }

                    // Find sessions that just appeared
                    const newSessions = sessions.filter(s => !seenIds.current.has(s.id));
                    if (!newSessions.length) return;

                    const newest = newSessions[0];
                    seenIds.current.add(newest.id);

                    // Play alert chime
                    playChime();

                    // Show notification
                    if (dismissTimer.current) clearTimeout(dismissTimer.current);
                    setNotification({
                        session: newest,
                        queuePosition: queueCount,
                        autoDismissAt: Date.now() + 45_000,
                    });
                    dismissTimer.current = setTimeout(dismiss, 45_000);

                }, (err) => {
                    logger.warn('[IncomingVisitNotification] onSnapshot error', { err });
                });
            } catch (err) {
                logger.warn('[IncomingVisitNotification] setup failed', { err });
            }
        };

        setup();
        return () => {
            if (unsubscribe) unsubscribe();
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
        };
    }, [user, dismiss]);

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    key={notification.session.id}
                    initial={{ y: 120, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 120, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    className="fixed bottom-5 right-5 z-[9999] w-full max-w-sm"
                >
                    <div className="rounded-2xl border border-emerald-200 bg-white shadow-2xl ring-2 ring-emerald-400/30 overflow-hidden">
                        {/* Progress bar auto-dismiss */}
                        <AutoDismissBar endsAt={notification.autoDismissAt} />

                        <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                                        <User className="h-4 w-4 text-emerald-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-tight">
                                            Customer Ready
                                            {notification.queuePosition > 1 && (
                                                <span className="ml-1.5 text-xs font-normal text-gray-500">
                                                    #{notification.queuePosition} in queue
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500">Checked in via tablet</p>
                                    </div>
                                </div>
                                <button
                                    onClick={dismiss}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Customer details */}
                            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-3 space-y-2">
                                {/* Name + mood */}
                                <div className="flex items-center justify-between">
                                    <span className="text-base font-semibold text-gray-900">
                                        {notification.session.customerName || 'Walk-in Customer'}
                                    </span>
                                    {notification.session.customerMood && (
                                        <span className="flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                                            {MOOD_EMOJI[notification.session.customerMood] ?? <Sparkles className="h-3 w-3" />}
                                            {notification.session.customerMood}
                                        </span>
                                    )}
                                </div>

                                {/* Cart items */}
                                {notification.session.cartItems && notification.session.cartItems.length > 0 ? (
                                    <div>
                                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
                                            <ShoppingCart className="h-3 w-3" /> Cart ({notification.session.cartItems.length})
                                        </p>
                                        <div className="space-y-0.5">
                                            {notification.session.cartItems.slice(0, 4).map((item) => (
                                                <div key={item.productId} className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-700 truncate max-w-[180px]">{item.name}</span>
                                                    <span className="text-xs font-semibold text-gray-900 ml-2">${item.price.toFixed(2)}</span>
                                                </div>
                                            ))}
                                            {notification.session.cartItems.length > 4 && (
                                                <p className="text-xs text-gray-400">+{notification.session.cartItems.length - 4} more items</p>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs font-bold text-gray-900 text-right">
                                            Total: ${notification.session.cartItems.reduce((s, i) => s + i.price, 0).toFixed(2)}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No items added — ask for preferences</p>
                                )}
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => handleServeNow(notification.session.id)}
                                disabled={serving}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
                            >
                                {serving ? (
                                    <span className="animate-pulse">Marking ready...</span>
                                ) : (
                                    <><CheckCircle className="h-4 w-4" /> Serve Now</>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AutoDismissBar({ endsAt }: { endsAt: number }) {
    const [pct, setPct] = useState(100);

    useEffect(() => {
        const total = endsAt - Date.now();
        const interval = setInterval(() => {
            const remaining = endsAt - Date.now();
            setPct(Math.max(0, (remaining / total) * 100));
            if (remaining <= 0) clearInterval(interval);
        }, 200);
        return () => clearInterval(interval);
    }, [endsAt]);

    return (
        <div className="h-1 bg-gray-100">
            <div
                className="h-full bg-emerald-400 transition-all duration-200"
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}
