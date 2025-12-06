'use client';

// src/components/visualizations/heat-map-visualization.tsx
/**
 * Geographic Heat Map Visualization
 * Shows foot traffic intensity across states and ZIP codes
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin, ZoomIn, ZoomOut, TrendingUp, Users, Eye } from 'lucide-react';

// US State Grid Layout (simplified 8x6 matrix)
const STATE_GRID = [
    ['', '', '', '', '', '', '', 'ME'],
    ['WA', 'MT', 'ND', 'MN', 'WI', 'MI', 'NY', 'VT', 'NH', 'MA'],
    ['OR', 'ID', 'SD', 'IA', 'IL', 'IN', 'OH', 'PA', 'NJ', 'CT', 'RI'],
    ['NV', 'WY', 'NE', 'MO', 'KY', 'WV', 'VA', 'MD', 'DE'],
    ['CA', 'UT', 'CO', 'KS', 'AR', 'TN', 'NC', 'SC'],
    ['AZ', 'NM', 'OK', 'LA', 'MS', 'AL', 'GA'],
    ['', 'TX', '', '', '', 'FL'],
    ['HI', '', '', '', '', '', 'AK'],
];

// State full names
const STATE_NAMES: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming',
};

interface FootTrafficData {
    stateCode: string;
    visits: number;
    checkouts: number;
    pageViews: number;
    conversionRate: number;
    topZipCodes?: { zip: string; visits: number }[];
}

interface HeatMapVisualizationProps {
    data: FootTrafficData[];
    title?: string;
    description?: string;
    period?: 'day' | 'week' | 'month';
    onStateClick?: (stateCode: string) => void;
}

export default function HeatMapVisualization({
    data,
    title = 'Foot Traffic Heat Map',
    description = 'Geographic distribution of customer visits and conversions',
    period = 'week',
    onStateClick,
}: HeatMapVisualizationProps) {
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [metric, setMetric] = useState<'visits' | 'checkouts' | 'pageViews'>('visits');
    const [hoveredState, setHoveredState] = useState<string | null>(null);

    // Create a lookup map for quick data access
    const dataMap = useMemo(() => {
        const map: Record<string, FootTrafficData> = {};
        data.forEach(d => {
            map[d.stateCode] = d;
        });
        return map;
    }, [data]);

    // Calculate max value for color scaling
    const maxValue = useMemo(() => {
        return Math.max(...data.map(d => d[metric]), 1);
    }, [data, metric]);

    // Get color intensity based on value
    const getIntensityColor = (stateCode: string) => {
        const stateData = dataMap[stateCode];
        if (!stateData) return 'bg-gray-100 dark:bg-gray-800 text-gray-400';

        const value = stateData[metric];
        const intensity = value / maxValue;

        if (intensity >= 0.8) return 'bg-emerald-600 text-white font-bold shadow-lg';
        if (intensity >= 0.6) return 'bg-emerald-500 text-white font-semibold';
        if (intensity >= 0.4) return 'bg-emerald-400 text-white';
        if (intensity >= 0.2) return 'bg-emerald-300 text-emerald-900';
        if (intensity > 0) return 'bg-emerald-200 text-emerald-700';
        return 'bg-gray-100 dark:bg-gray-800 text-gray-400';
    };

    // Get state data for tooltip
    const getStateInfo = (stateCode: string) => {
        const stateData = dataMap[stateCode];
        if (!stateData) return null;
        return {
            name: STATE_NAMES[stateCode] || stateCode,
            ...stateData,
        };
    };

    // Total metrics
    const totals = useMemo(() => ({
        visits: data.reduce((sum, d) => sum + d.visits, 0),
        checkouts: data.reduce((sum, d) => sum + d.checkouts, 0),
        pageViews: data.reduce((sum, d) => sum + d.pageViews, 0),
        avgConversion: data.length > 0
            ? (data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length).toFixed(1)
            : '0',
    }), [data]);

    const activeStateData = selectedState ? getStateInfo(selectedState) : null;
    const hoveredStateData = hoveredState ? getStateInfo(hoveredState) : null;

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-xl font-bold">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="visits">
                                <span className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Visits
                                </span>
                            </SelectItem>
                            <SelectItem value="checkouts">
                                <span className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Checkouts
                                </span>
                            </SelectItem>
                            <SelectItem value="pageViews">
                                <span className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Page Views
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Badge variant="outline" className="capitalize">
                        {period}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">
                            {totals.visits.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Visits</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {totals.checkouts.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Checkouts</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                            {totals.pageViews.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Page Views</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                            {totals.avgConversion}%
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Conversion</div>
                    </div>
                </div>

                {/* Heat Map Grid */}
                <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4">
                    <div className="space-y-1">
                        {STATE_GRID.map((row, rowIdx) => (
                            <div key={rowIdx} className="flex gap-1 justify-center">
                                {row.map((state, colIdx) => (
                                    <div
                                        key={`${rowIdx}-${colIdx}`}
                                        className={`w-10 h-10 flex items-center justify-center rounded-md text-xs font-medium transition-all duration-200 ${state
                                                ? `${getIntensityColor(state)} cursor-pointer hover:scale-110 hover:z-10 hover:shadow-xl`
                                                : 'bg-transparent'
                                            } ${selectedState === state ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                        onClick={() => {
                                            if (state) {
                                                setSelectedState(state === selectedState ? null : state);
                                                onStateClick?.(state);
                                            }
                                        }}
                                        onMouseEnter={() => state && setHoveredState(state)}
                                        onMouseLeave={() => setHoveredState(null)}
                                    >
                                        {state || ''}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Hover Tooltip */}
                    {hoveredStateData && (
                        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[180px] z-20 border">
                            <div className="font-bold text-lg flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-emerald-600" />
                                {hoveredStateData.name}
                            </div>
                            <div className="mt-2 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Visits:</span>
                                    <span className="font-semibold">{hoveredStateData.visits.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Checkouts:</span>
                                    <span className="font-semibold">{hoveredStateData.checkouts.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Conversion:</span>
                                    <span className="font-semibold">{hoveredStateData.conversionRate}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center mt-4 gap-2 text-sm">
                    <span className="text-muted-foreground">Low</span>
                    <div className="flex gap-1">
                        <div className="w-6 h-4 rounded bg-emerald-200" />
                        <div className="w-6 h-4 rounded bg-emerald-300" />
                        <div className="w-6 h-4 rounded bg-emerald-400" />
                        <div className="w-6 h-4 rounded bg-emerald-500" />
                        <div className="w-6 h-4 rounded bg-emerald-600" />
                    </div>
                    <span className="text-muted-foreground">High</span>
                </div>

                {/* Selected State Detail */}
                {activeStateData && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-emerald-600" />
                                {activeStateData.name} Details
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedState(null)}
                            >
                                Close
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-2xl font-bold">{activeStateData.visits.toLocaleString()}</div>
                                <div className="text-sm text-muted-foreground">Store Visits</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{activeStateData.checkouts.toLocaleString()}</div>
                                <div className="text-sm text-muted-foreground">Checkouts</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{activeStateData.pageViews.toLocaleString()}</div>
                                <div className="text-sm text-muted-foreground">Page Views</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{activeStateData.conversionRate}%</div>
                                <div className="text-sm text-muted-foreground">Conversion Rate</div>
                            </div>
                        </div>

                        {/* Top ZIP Codes */}
                        {activeStateData.topZipCodes && activeStateData.topZipCodes.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">Top ZIP Codes</h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeStateData.topZipCodes.slice(0, 5).map(zip => (
                                        <Badge key={zip.zip} variant="secondary">
                                            {zip.zip}: {zip.visits} visits
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Export sample data generator for testing
export function generateSampleHeatMapData(): FootTrafficData[] {
    const states = Object.keys(STATE_NAMES);
    return states.map(stateCode => ({
        stateCode,
        visits: Math.floor(Math.random() * 10000),
        checkouts: Math.floor(Math.random() * 2000),
        pageViews: Math.floor(Math.random() * 50000),
        conversionRate: Math.round(Math.random() * 15 * 10) / 10,
        topZipCodes: [
            { zip: `${stateCode}001`, visits: Math.floor(Math.random() * 500) },
            { zip: `${stateCode}002`, visits: Math.floor(Math.random() * 400) },
            { zip: `${stateCode}003`, visits: Math.floor(Math.random() * 300) },
        ],
    }));
}
