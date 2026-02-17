'use client';

/**
 * Signature Pad Component
 *
 * HTML canvas-based signature capture for proof of delivery
 * NY OCM Requirement: Customer signature required for all cannabis deliveries
 * Features:
 * - Touch & mouse drawing
 * - Clear signature
 * - Export as data URL
 * - Minimum stroke validation (ensures real signature, not empty)
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
    onSignature: (signatureDataUrl: string | null) => void;
    width?: number;
    height?: number;
    disabled?: boolean;
}

export function SignaturePad({
    onSignature,
    width = 400,
    height = 150,
    disabled = false,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const strokeCountRef = useRef(0);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size from actual element size for HiDPI
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Style
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getPos = (
        e: MouseEvent | TouchEvent,
        canvas: HTMLCanvasElement
    ): { x: number; y: number } => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            const touch = e.touches[0];
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
            };
        }
        return {
            x: (e as MouseEvent).clientX - rect.left,
            y: (e as MouseEvent).clientY - rect.top,
        };
    };

    const startDrawing = useCallback(
        (e: MouseEvent | TouchEvent) => {
            if (disabled) return;
            const canvas = canvasRef.current;
            if (!canvas) return;

            e.preventDefault();
            isDrawingRef.current = true;
            lastPosRef.current = getPos(e, canvas);
        },
        [disabled]
    );

    const draw = useCallback(
        (e: MouseEvent | TouchEvent) => {
            if (!isDrawingRef.current || disabled) return;
            const canvas = canvasRef.current;
            if (!canvas) return;

            e.preventDefault();
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const pos = getPos(e, canvas);

            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();

            lastPosRef.current = pos;
            strokeCountRef.current += 1;
            setHasSignature(true);
        },
        [disabled]
    );

    const stopDrawing = useCallback(() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Export signature if enough strokes drawn
        if (strokeCountRef.current > 10) {
            const dataUrl = canvas.toDataURL('image/png');
            onSignature(dataUrl);
        }
    }, [onSignature]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseleave', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
        };
    }, [startDrawing, draw, stopDrawing]);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        strokeCountRef.current = 0;
        setHasSignature(false);
        onSignature(null);
    };

    return (
        <div className="space-y-2">
            <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
                <canvas
                    ref={canvasRef}
                    className="block touch-none"
                    style={{ width: '100%', height: `${height}px` }}
                />
                {!hasSignature && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-muted-foreground text-sm">Sign here</p>
                    </div>
                )}
                {disabled && (
                    <div className="absolute inset-0 bg-background/50" />
                )}
            </div>
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    {hasSignature ? '✓ Signature captured' : 'Draw your signature above'}
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSignature}
                    disabled={!hasSignature || disabled}
                >
                    <RotateCcw className="mr-1.5 h-3 w-3" />
                    Clear
                </Button>
            </div>
        </div>
    );
}
