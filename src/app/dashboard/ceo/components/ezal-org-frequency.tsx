'use client';

/**
 * EzalOrgFrequency — Super User panel to manage competitive intel sync frequency per org
 *
 * Renders an org selector + 4-option frequency toggle (Monthly / Weekly / Daily / Empire 15min)
 * Calls setCompetitiveIntelFrequency() server action to update all data sources for that org.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    setCompetitiveIntelFrequency,
    getCompetitiveIntelFrequency,
    type CIFrequencyPreset,
} from '../actions/system-actions';

// Orgs that have competitive intel configured (expand as more customers added)
const KNOWN_CI_ORGS = [
    { id: 'org_thrive_syracuse', label: 'Thrive Syracuse' },
    { id: 'dispensary_herbalistsamui', label: 'Herbalist Samui' },
];

const PRESETS: { value: CIFrequencyPreset; label: string; description: string; badge: string }[] = [
    { value: 'empire',  label: 'Empire (15 min)',  description: 'Real-time monitoring — paid tier', badge: 'bg-green-100 text-green-800' },
    { value: 'daily',   label: 'Daily',            description: 'Once per day refresh',            badge: 'bg-blue-100 text-blue-800' },
    { value: 'weekly',  label: 'Weekly',           description: 'Once per week refresh',           badge: 'bg-yellow-100 text-yellow-800' },
    { value: 'monthly', label: 'Monthly',          description: 'Once per month — free/testing',   badge: 'bg-gray-100 text-gray-700' },
];

export function EzalOrgFrequency() {
    const { toast } = useToast();
    const [selectedOrg, setSelectedOrg] = useState<string>(KNOWN_CI_ORGS[0].id);
    const [currentFreq, setCurrentFreq] = useState<{
        preset: CIFrequencyPreset | 'custom' | null;
        frequencyMinutes: number | null;
        sourceCount: number;
    } | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchFrequency = async (orgId: string) => {
        setLoading(true);
        setCurrentFreq(null);
        try {
            const result = await getCompetitiveIntelFrequency(orgId);
            setCurrentFreq(result);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFrequency(selectedOrg);
    }, [selectedOrg]);

    const handleSet = async (preset: CIFrequencyPreset) => {
        setSaving(true);
        try {
            const result = await setCompetitiveIntelFrequency(selectedOrg, preset);
            if (result.error) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Frequency updated', description: result.message });
                await fetchFrequency(selectedOrg);
            }
        } finally {
            setSaving(false);
        }
    };

    const orgLabel = KNOWN_CI_ORGS.find(o => o.id === selectedOrg)?.label ?? selectedOrg;
    const activePreset = PRESETS.find(p => p.value === currentFreq?.preset);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Competitive Intel Frequency
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => fetchFrequency(selectedOrg)}
                    disabled={loading}
                >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Org selector */}
                <div className="flex items-center gap-3">
                    <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select org" />
                        </SelectTrigger>
                        <SelectContent>
                            {KNOWN_CI_ORGS.map(org => (
                                <SelectItem key={org.id} value={org.id} className="text-xs">
                                    {org.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {currentFreq !== null && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {currentFreq.sourceCount} source{currentFreq.sourceCount !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>

                {/* Current status */}
                {loading && (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                )}
                {!loading && currentFreq?.sourceCount === 0 && (
                    <p className="text-xs text-muted-foreground">No data sources configured for {orgLabel}.</p>
                )}
                {!loading && currentFreq && currentFreq.sourceCount > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Current:</span>
                        {activePreset ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${activePreset.badge}`}>
                                {activePreset.label}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                Custom ({currentFreq.frequencyMinutes} min)
                            </span>
                        )}
                    </div>
                )}

                {/* Preset buttons */}
                {!loading && currentFreq && currentFreq.sourceCount > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map(preset => {
                            const isActive = currentFreq.preset === preset.value;
                            return (
                                <button
                                    key={preset.value}
                                    onClick={() => handleSet(preset.value)}
                                    disabled={saving || isActive}
                                    className={`
                                        text-left px-3 py-2 rounded-md border text-xs transition-colors
                                        ${isActive
                                            ? 'border-primary bg-primary/5 text-primary font-medium cursor-default'
                                            : 'border-border hover:border-primary/40 hover:bg-muted/50 text-foreground cursor-pointer disabled:opacity-50'
                                        }
                                    `}
                                >
                                    <div className="font-medium">{preset.label}</div>
                                    <div className="text-muted-foreground mt-0.5 text-[10px]">{preset.description}</div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {saving && (
                    <p className="text-xs text-muted-foreground">Updating...</p>
                )}
            </CardContent>
        </Card>
    );
}
