'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Bell } from 'lucide-react';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface KioskPickDoc {
    id: string;
    firstName: string;
    mood: string | null;
    productNames: string[];
    productIds: string[];
    status: string;
    createdAt: { seconds: number } | Date;
}

interface ToastItem extends KioskPickDoc {
    toastId: string;
}

interface KioskOrderNotificationsProps {
    orgId: string;
}

export function KioskOrderNotifications({ orgId }: KioskOrderNotificationsProps) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const seenIds = useRef(new Set<string>());
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (!orgId) return;

        const { firestore: db } = initializeFirebase();
        const picksRef = collection(db, 'tenants', orgId, 'kioskPicks');
        const q = query(
            picksRef,
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as KioskPickDoc));
            setPendingCount(docs.length);

            if (isFirstLoad.current) {
                // On first load, just seed seenIds — don't toast existing pending orders
                docs.forEach(d => seenIds.current.add(d.id));
                isFirstLoad.current = false;
                return;
            }

            // Only toast truly new docs (not seen before)
            const newPicks = docs.filter(d => !seenIds.current.has(d.id));
            if (newPicks.length === 0) return;

            newPicks.forEach(pick => {
                seenIds.current.add(pick.id);
                const toastId = `${pick.id}-${Date.now()}`;
                setToasts(prev => [...prev, { ...pick, toastId }]);
                // Auto-dismiss after 8s
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.toastId !== toastId));
                }, 8000);
            });
        });

        return () => unsub();
    }, [orgId]);

    const dismiss = (toastId: string) => {
        setToasts(prev => prev.filter(t => t.toastId !== toastId));
    };

    const markFulfilled = async (pickId: string, toastId: string) => {
        try {
            const { firestore: db } = initializeFirebase();
            await updateDoc(doc(db, 'tenants', orgId, 'kioskPicks', pickId), { status: 'fulfilled' });
        } catch { /* non-critical */ }
        dismiss(toastId);
    };

    return (
        <>
            {/* Pending badge in header area */}
            {pendingCount > 0 && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5"
                >
                    <Bell className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-700">
                        {pendingCount} kiosk order{pendingCount !== 1 ? 's' : ''} pending
                    </span>
                </motion.div>
            )}

            {/* Toast notifications — fixed bottom-right */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.toastId}
                            initial={{ x: 80, opacity: 0, scale: 0.9 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: 80, opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                            className="pointer-events-auto w-80 rounded-2xl border bg-white shadow-2xl overflow-hidden"
                            style={{ borderColor: 'rgba(16,185,129,0.3)' }}
                        >
                            {/* Green accent bar */}
                            <div className="h-1 w-full bg-emerald-500" />
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                                            <ShoppingCart className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                New Kiosk Order
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {toast.firstName}{toast.mood ? ` · ${toast.mood}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => dismiss(toast.toastId)}
                                        className="shrink-0 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {toast.productNames.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {toast.productNames.slice(0, 4).map((name, i) => (
                                            <span
                                                key={i}
                                                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                                            >
                                                {name}
                                            </span>
                                        ))}
                                        {toast.productNames.length > 4 && (
                                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                                                +{toast.productNames.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => markFulfilled(toast.id, toast.toastId)}
                                    className="mt-3 w-full rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition-colors"
                                >
                                    Mark Fulfilled
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </>
    );
}
