'use client';

/**
 * CheckinCounterPanel
 *
 * Slide-out sheet for budtenders at the counter.
 * Shows the checked-in customer's mood, cart interest, last purchase,
 * and a Smokey voice interface so the budtender + customer can talk through
 * strains and get live recommendations together.
 *
 * Triggered by clicking a row in CheckInVisitFeed.
 */

import { useEffect, useState } from 'react';
import {
    Clock,
    Loader2,
    Mic,
    MicOff,
    ShoppingCart,
    Volume2,
    X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { MOOD_EMOJI } from '@/lib/checkin/loyalty-tablet-shared';
import { useSmokeyVoice } from '@/hooks/use-smokey-voice';
import { timeAgo } from './checkin-visit-feed';
import type { CheckinVisitRow } from '@/lib/checkin/checkin-management-shared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    orgId: string;
    visit: CheckinVisitRow | null;
    onClose: () => void;
}

// ─── Mic button ───────────────────────────────────────────────────────────────

interface MicButtonProps {
    isRecording: boolean;
    isProcessing: boolean;
    isSpeaking: boolean;
    isSupported: boolean;
    onStart: () => void;
    onStop: () => void;
}

function MicButton({ isRecording, isProcessing, isSpeaking, isSupported, onStart, onStop }: MicButtonProps) {
    if (!isSupported) {
        return (
            <p className="text-xs text-muted-foreground text-center">
                Microphone not available on this browser.
            </p>
        );
    }

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Smokey is thinking…</p>
            </div>
        );
    }

    if (isSpeaking) {
        return (
            <div className="flex flex-col items-center gap-2">
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center animate-pulse">
                    <Volume2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="text-xs text-emerald-600 font-medium">Smokey is speaking…</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                type="button"
                onPointerDown={onStart}
                onPointerUp={onStop}
                onPointerLeave={onStop}
                className={`h-16 w-16 rounded-full border-2 flex items-center justify-center transition-all select-none ${
                    isRecording
                        ? 'bg-red-500 border-red-400 scale-110 shadow-lg shadow-red-500/30'
                        : 'bg-muted border-border hover:border-foreground/40 hover:bg-muted/70'
                }`}
                aria-label={isRecording ? 'Release to send' : 'Hold to speak'}
            >
                {isRecording
                    ? <MicOff className="h-7 w-7 text-white" />
                    : <Mic className="h-7 w-7 text-muted-foreground" />}
            </button>
            <p className="text-xs text-muted-foreground">
                {isRecording ? 'Release to send to Smokey' : 'Hold to speak to Smokey'}
            </p>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CheckinCounterPanel({ orgId, visit, onClose }: Props) {
    const [conversationLog, setConversationLog] = useState<Array<{
        role: 'budtender' | 'smokey';
        text: string;
        ts: number;
    }>>([]);

    // Reset conversation when a new customer is selected
    useEffect(() => {
        if (visit) setConversationLog([]);
    }, [visit?.visitId]);

    const voice = useSmokeyVoice({
        orgId,
        customerName: visit?.firstName,
        customerId: visit?.customerId ?? undefined,
        mood: visit?.mood ?? undefined,
        cartItems: visit?.cartProductIds,
    });

    // Append Smokey's response to conversation log when it arrives
    useEffect(() => {
        if (voice.state === 'speaking' && voice.transcript) {
            setConversationLog((prev) => {
                // Avoid duplicate appends
                const last = prev[prev.length - 1];
                if (last?.role === 'smokey' && last.text === voice.transcript) return prev;
                return [
                    ...prev,
                    { role: 'smokey', text: voice.transcript, ts: Date.now() },
                ];
            });
        }
    }, [voice.state, voice.transcript]);

    // Append budtender's spoken input when Gemini returns it
    useEffect(() => {
        if (voice.inputTranscript) {
            setConversationLog((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'budtender' && last.text === voice.inputTranscript) return prev;
                return [
                    ...prev,
                    { role: 'budtender', text: voice.inputTranscript, ts: Date.now() - 1 },
                ];
            });
        }
    }, [voice.inputTranscript]);

    const handleMicStart = () => {
        if (voice.state === 'idle' || voice.state === 'error') {
            voice.startRecording();
        }
    };

    const handleMicStop = () => {
        if (voice.state === 'recording') {
            voice.stopAndSend();
        }
    };

    return (
        <Sheet
            open={Boolean(visit)}
            onOpenChange={(open) => {
                // Keep panel open while Smokey is listening, processing, or speaking
                const voiceActive = voice.state === 'recording' || voice.state === 'processing' || voice.state === 'speaking';
                if (!open && !voiceActive) onClose();
            }}
        >
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
                {visit && (
                    <>
                        {/* Header */}
                        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <SheetTitle className="text-lg">
                                        {visit.firstName}
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            ···{visit.phoneLast4}
                                        </span>
                                    </SheetTitle>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                        {visit.mood && (
                                            <Badge variant="outline" className="text-xs gap-1">
                                                {MOOD_EMOJI[visit.mood] ?? '🌿'} {visit.mood}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {timeAgo(visit.visitedAt)}
                                        </span>
                                        {visit.isReturning && (
                                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                                                Returning
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="shrink-0 -mt-1" onClick={onClose}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </SheetHeader>

                        {/* Cart interest */}
                        {visit.cartProductIds.length > 0 && (
                            <div className="px-5 py-3 border-b bg-muted/20 shrink-0">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    Flagged interest ({visit.cartProductIds.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {visit.cartProductIds.map((id) => (
                                        <Badge key={id} variant="outline" className="text-xs font-mono">
                                            {id.slice(-8)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Conversation log */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                            {conversationLog.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                                    <img
                                        src="/assets/agents/smokey-main.png"
                                        alt="Smokey"
                                        className="h-16 w-16 rounded-2xl object-cover shadow-sm"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    <div>
                                        <p className="text-sm font-medium">Smokey is ready</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                                            Hold the mic and ask anything about strains, effects, or what this customer bought before.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                conversationLog.map((entry, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-2 ${entry.role === 'budtender' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {entry.role === 'smokey' && (
                                            <div className="h-6 w-6 rounded-full bg-emerald-500/10 overflow-hidden shrink-0 mt-0.5 flex items-center justify-center">
                                                <img
                                                    src="/assets/agents/smokey-main.png"
                                                    alt="Smokey"
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                                                entry.role === 'budtender'
                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : 'bg-muted text-foreground rounded-bl-sm'
                                            }`}
                                        >
                                            {entry.text}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Error */}
                        {voice.error && (
                            <div className="px-5 py-2 shrink-0">
                                <p className="text-xs text-destructive text-center">{voice.error}</p>
                            </div>
                        )}

                        {/* Voice controls */}
                        <div className="px-5 py-5 border-t bg-muted/10 shrink-0 flex justify-center">
                            <MicButton
                                isRecording={voice.state === 'recording'}
                                isProcessing={voice.state === 'processing'}
                                isSpeaking={voice.state === 'speaking'}
                                isSupported={voice.isSupported}
                                onStart={handleMicStart}
                                onStop={handleMicStop}
                            />
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
