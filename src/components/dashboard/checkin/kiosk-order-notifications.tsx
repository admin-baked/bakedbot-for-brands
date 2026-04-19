'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Bell } from 'lucide-react';
import { hexToRgba } from '@/lib/utils';
import {
    getPendingKioskPicks,
    markKioskPickFulfilled,
    type KioskPickRow,
} from '@/server/actions/checkin-management';

// ─── Fireworks ────────────────────────────────────────────────────────────────

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    alpha: number;
    color: string;
    size: number;
    decay: number;
    trail: Array<{ x: number; y: number; alpha: number }>;
}

interface Shell {
    x: number; y: number;
    vy: number;
    color: string;
    exploded: boolean;
    trail: Array<{ x: number; y: number }>;
}


function FireworksCanvas({ onDone }: { onDone: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const COLORS = [
            '#FFD700', '#FF6B35', '#00E5FF', '#FF1744', '#76FF03',
            '#E040FB', '#FFB300', '#00E676', '#FF4081', '#40C4FF',
            '#FFEB3B', '#F48FB1', '#80DEEA', '#CCFF90',
        ];

        const shells: Shell[] = [];
        const particles: Particle[] = [];

        const launchShell = () => {
            // Bias toward center-right where the toast lives
            const x = canvas.width * (0.25 + Math.random() * 0.6);
            const targetY = canvas.height * (0.08 + Math.random() * 0.38);
            const speed = (canvas.height - targetY) / 32;
            shells.push({
                x,
                y: canvas.height,
                vy: -speed,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                exploded: false,
                trail: [],
            });
        };

        const explodeShell = (shell: Shell) => {
            // Main burst
            const count = 90 + Math.floor(Math.random() * 50);
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const speed = 2.5 + Math.random() * 5;
                particles.push({
                    x: shell.x, y: shell.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.5,
                    alpha: 1,
                    color: shell.color,
                    size: 2 + Math.random() * 2.5,
                    decay: 0.010 + Math.random() * 0.008,
                    trail: [],
                });
            }
            // White sparkle ring — tighter, faster fade
            for (let i = 0; i < 35; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 6 + Math.random() * 6;
                particles.push({
                    x: shell.x, y: shell.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2,
                    alpha: 1,
                    color: '#FFFFFF',
                    size: 1.5,
                    decay: 0.028 + Math.random() * 0.012,
                    trail: [],
                });
            }
            // Glitter — slow-drift gold motes
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.5 + Math.random() * 2;
                particles.push({
                    x: shell.x, y: shell.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    alpha: 1,
                    color: '#FFD700',
                    size: 3,
                    decay: 0.007 + Math.random() * 0.005,
                    trail: [],
                });
            }
        };

        // 6 shells staggered: tight initial burst then trailing sparklers
        const delays = [0, 180, 380, 600, 850, 1150];
        const timers = delays.map(d => setTimeout(launchShell, d));

        let animFrame: number;
        const startTime = Date.now();

        const animate = () => {
            // Semi-transparent fill creates motion-blur trail effect
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Shells rising
            for (let i = shells.length - 1; i >= 0; i--) {
                const s = shells[i];
                s.trail.push({ x: s.x, y: s.y });
                if (s.trail.length > 10) s.trail.shift();

                s.vy += 0.12; // gravity
                s.y += s.vy;

                // Shell trail
                s.trail.forEach((pt, idx) => {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,200,${(idx / s.trail.length) * 0.7})`;
                    ctx.fill();
                });

                // Shell head glow
                ctx.beginPath();
                ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = s.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Explode at apex (velocity near zero or starts falling)
                if (!s.exploded && s.vy >= -0.3) {
                    s.exploded = true;
                    explodeShell(s);
                    shells.splice(i, 1);
                }
            }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
                if (p.trail.length > 6) p.trail.shift();

                p.vy += 0.07; // gravity
                p.vx *= 0.985; // drag
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;

                if (p.alpha <= 0) { particles.splice(i, 1); continue; }

                // Particle trail
                p.trail.forEach((pt, idx) => {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, p.size * 0.45, 0, Math.PI * 2);
                    ctx.fillStyle = hexToRgba(p.color, (idx / p.trail.length) * pt.alpha * 0.35);
                    ctx.fill();
                });

                // Particle with glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.fillStyle = hexToRgba(p.color, p.alpha);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            const elapsed = Date.now() - startTime;
            if (shells.length > 0 || particles.length > 0 || elapsed < 1500) {
                animFrame = requestAnimationFrame(animate);
            } else {
                // Fade the canvas out
                onDoneRef.current();
            }
        };

        animFrame = requestAnimationFrame(animate);

        return () => {
            timers.forEach(clearTimeout);
            cancelAnimationFrame(animFrame);
        };
    }, []);

    return (
        <motion.canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 48 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        />
    );
}

// ─── Notification types ───────────────────────────────────────────────────────

interface ToastItem extends KioskPickRow {
    toastId: string;
}

interface KioskOrderNotificationsProps {
    orgId: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function KioskOrderNotifications({ orgId }: KioskOrderNotificationsProps) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [fireworksKey, setFireworksKey] = useState<number | null>(null);
    const seenIds = useRef(new Set<string>());
    const isFirstLoad = useRef(true);

    const triggerFireworks = useCallback(() => {
        setFireworksKey(k => (k ?? 0) + 1);
    }, []);

    const poll = useCallback(async () => {
        const result = await getPendingKioskPicks(orgId).catch(() => null);
        if (!result?.success || !result.picks) return;

        const docs = result.picks;
        setPendingCount(docs.length);

        if (isFirstLoad.current) {
            docs.forEach(d => seenIds.current.add(d.id));
            isFirstLoad.current = false;
            return;
        }

        const newPicks = docs.filter(d => !seenIds.current.has(d.id));
        if (newPicks.length === 0) return;

        newPicks.forEach(pick => {
            seenIds.current.add(pick.id);
            const toastId = `${pick.id}-${Date.now()}`;
            setToasts(prev => [...prev, { ...pick, toastId }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.toastId !== toastId));
            }, 8000);
        });

        triggerFireworks();
    }, [orgId, triggerFireworks]);

    useEffect(() => {
        if (!orgId) return;
        void poll();
        const interval = setInterval(() => { void poll(); }, 10_000);
        return () => clearInterval(interval);
    }, [orgId, poll]);

    const dismiss = (toastId: string) => {
        setToasts(prev => prev.filter(t => t.toastId !== toastId));
    };

    const handleMarkFulfilled = async (pickId: string, toastId: string) => {
        await markKioskPickFulfilled(orgId, pickId).catch(() => { /* non-critical */ });
        dismiss(toastId);
        // Optimistically decrement pending count
        setPendingCount(prev => Math.max(0, prev - 1));
    };

    return (
        <>
            {/* Pending badge */}
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

            {/* Fireworks canvas — mounts fresh on each new order */}
            <AnimatePresence>
                {fireworksKey !== null && (
                    <FireworksCanvas
                        key={fireworksKey}
                        onDone={() => setFireworksKey(null)}
                    />
                )}
            </AnimatePresence>

            {/* Toast notifications — fixed bottom-right, above canvas */}
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
                            {/* Animated rainbow top bar */}
                            <motion.div
                                className="h-1.5 w-full"
                                style={{
                                    background: 'linear-gradient(90deg, #FFD700, #FF6B35, #FF1744, #E040FB, #00E5FF, #76FF03, #FFD700)',
                                    backgroundSize: '200% 100%',
                                }}
                                animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <motion.div
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10"
                                            animate={{ scale: [1, 1.15, 1] }}
                                            transition={{ duration: 0.4, times: [0, 0.5, 1] }}
                                        >
                                            <ShoppingCart className="h-4 w-4 text-emerald-600" />
                                        </motion.div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">New Kiosk Order 🎉</p>
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
                                            <motion.span
                                                key={i}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.07 }}
                                                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                                            >
                                                {name}
                                            </motion.span>
                                        ))}
                                        {toast.productNames.length > 4 && (
                                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                                                +{toast.productNames.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => void handleMarkFulfilled(toast.id, toast.toastId)}
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
