'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

// Simplified SVG paths for key US states (CA, NV, CO, WA, OR, NY, FL, etc.) for brevity and demo impact
// In a full prod app, I'd import a full US json map.
// Using a "Stylized" hex map or block map approach is safer for reduced code, but I'll draw a few key paths.
// Actually, for a quick impressive demo, a "Grid Map" or "Tile Map" is often cleaner than complex paths.
// Let's use a "Tile Grid" representation of the US for clarity and robustness.

const US_STATE_GRID = [
    ['AK', null, null, null, null, null, null, null, null, null, null, 'ME'],
    [null, null, null, null, null, null, null, null, null, null, 'VT', 'NH'],
    ['WA', 'ID', 'MT', 'ND', 'MN', 'IL', 'WI', 'MI', 'NY', 'RI', 'MA', 'CT'],
    ['OR', 'NV', 'WY', 'SD', 'IA', 'IN', 'OH', 'PA', 'NJ', 'DC', 'MD', 'DE'],
    ['CA', 'UT', 'CO', 'NE', 'MO', 'KY', 'WV', 'VA', null, null, null, null],
    [null, 'AZ', 'NM', 'KS', 'AR', 'TN', 'NC', 'SC', null, null, null, null],
    [null, null, null, 'OK', 'LA', 'MS', 'AL', 'GA', null, null, null, null],
    ['HI', null, null, 'TX', null, null, null, 'FL', null, null, null, null],
];

interface DistributionMapProps {
    retailerCountsByState: Record<string, number>;
}

export default function DistributionMap({ retailerCountsByState }: DistributionMapProps) {
    const [hoveredState, setHoveredState] = useState<string | null>(null);

    const maxCount = Math.max(...Object.values(retailerCountsByState), 1);

    const getColor = (stateCode: string) => {
        const count = retailerCountsByState[stateCode] || 0;
        if (count === 0) return 'bg-muted text-muted-foreground/30';
        // Opacity based on count
        const intensity = Math.min(count / maxCount, 1);
        if (intensity > 0.8) return 'bg-primary text-primary-foreground font-bold shadow-md';
        if (intensity > 0.5) return 'bg-primary/80 text-primary-foreground';
        if (intensity > 0.2) return 'bg-primary/60 text-white';
        return 'bg-primary/40 text-foreground';
    };

    return (
        <div className="w-full overflow-x-auto">
            <div className="min-w-[600px] p-8 flex flex-col gap-2 items-center justify-center">
                {US_STATE_GRID.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-2">
                        {row.map((activeState, colIndex) => (
                            <div key={colIndex} className="w-12 h-12 flex-shrink-0">
                                {activeState ? (
                                    <div
                                        className={`w-full h-full rounded-md flex items-center justify-center text-xs cursor-pointer transition-all duration-200 hover:scale-110 ${getColor(activeState)}`}
                                        onMouseEnter={() => setHoveredState(activeState)}
                                        onMouseLeave={() => setHoveredState(null)}
                                        title={`${activeState}: ${retailerCountsByState[activeState] || 0} locations`}
                                    >
                                        {activeState}
                                    </div>
                                ) : (
                                    <div className="w-full h-full" />
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {hoveredState && (
                <div className="text-center h-6 text-sm font-medium text-primary fade-in animate-in">
                    {hoveredState}: {retailerCountsByState[hoveredState] || 0} active retailers
                </div>
            )}
        </div>
    );
}
