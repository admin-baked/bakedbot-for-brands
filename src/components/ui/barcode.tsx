'use client';

/**
 * Barcode Component
 * 
 * Renders a Code 128 barcode as an SVG.
 */

import { generateBarcodeBars } from '@/lib/utils/barcode-128';

interface BarcodeProps {
    value: string;
    height?: number;
    className?: string;
    showValue?: boolean;
}

export function Barcode({ 
    value, 
    height = 60, 
    className = '', 
    showValue = true 
}: BarcodeProps) {
    const { bars, totalWidth } = generateBarcodeBars(value);
    
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <svg
                viewBox={`0 0 ${totalWidth} ${height}`}
                className="w-full"
                preserveAspectRatio="none"
                style={{ height: `${height}px` }}
            >
                {bars.map((bar, i) => (
                    <rect
                        key={i}
                        x={bar.x}
                        y={0}
                        width={bar.width}
                        height={height}
                        fill="currentColor"
                    />
                ))}
            </svg>
            {showValue && (
                <span className="mt-1 text-[10px] font-mono tracking-widest text-gray-500 uppercase">
                    {value}
                </span>
            )}
        </div>
    );
}
