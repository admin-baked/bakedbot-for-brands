'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Users, Sparkles, Plus, Filter, ArrowLeft,
    Loader2, Trash2, Save, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CustomerSegment, getSegmentInfo, SegmentSuggestion, CustomSegment, SegmentFilter } from '@/types/customers';
import { getSuggestedSegments, getCustomers } from '../actions';
import Link from 'next/link';

interface SegmentsPageProps {
    brandId: string;
}

// Built-in segment definitions
const BUILT_IN_SEGMENTS: { id: CustomerSegment; label: string; description: string; color: string }[] = [
    { id: 'vip', label: 'VIP', description: 'Top customers by spend ($1000+ or 10+ orders)', color: 'bg-purple-100 text-purple-800' },
    { id: 'loyal', label: 'Loyal', description: 'Regular customers with 3+ orders', color: 'bg-green-100 text-green-800' },
    { id: 'new', label: 'New', description: 'Acquired in the last 30 days', color: 'bg-blue-100 text-blue-800' },
    { id: 'at_risk', label: 'At Risk', description: '60-89 days since last order', color: 'bg-red-100 text-red-800' },
    { id: 'slipping', label: 'Slipping', description: '30-59 days since last order', color: 'bg-orange-100 text-orange-800' },
    { id: 'churned', label: 'Churned', description: '90+ days since last order', color: 'bg-gray-100 text-gray-800' },
    { id: 'high_value', label: 'High Value', description: 'High AOV, lower frequency', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'frequent', label: 'Frequent', description: 'High frequency, lower AOV', color: 'bg-teal-100 text-teal-800' },
];

export default function SegmentsPage({ brandId }: SegmentsPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
    const [suggestions, setSuggestions] = useState<SegmentSuggestion[]>([]);
    const [showBuilder, setShowBuilder] = useState(false);

    // Custom segment builder state
    const [customName, setCustomName] = useState('');
    const [customFilters, setCustomFilters] = useState<SegmentFilter[]>([
        { field: 'totalSpent', operator: 'greater_than', value: 100 }
    ]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Get all customers to count segments
            const data = await getCustomers(brandId);
            const counts: Record<string, number> = {};

            data.customers.forEach(c => {
                counts[c.segment] = (counts[c.segment] || 0) + 1;
            });

            setSegmentCounts(counts);

            // Get AI suggestions
            const sugs = await getSuggestedSegments(brandId);
            setSuggestions(sugs);
        } catch (error) {
            console.error('Failed to load segments:', error);
        } finally {
            setLoading(false);
        }
    }, [brandId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleViewSegment = (segmentId: CustomerSegment) => {
        router.push(`/dashboard/customers?segment=${segmentId}`);
    };

    const addFilter = () => {
        setCustomFilters([...customFilters, { field: 'orderCount', operator: 'greater_than', value: 0 }]);
    };

    const removeFilter = (index: number) => {
        setCustomFilters(customFilters.filter((_, i) => i !== index));
    };

    const updateFilter = (index: number, updates: Partial<SegmentFilter>) => {
        const updated = [...customFilters];
        updated[index] = { ...updated[index], ...updates };
        setCustomFilters(updated);
    };

    const handleSaveCustomSegment = async () => {
        if (!customName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Segment name is required' });
            return;
        }

        // For now, just show success - actual persistence would need backend
        toast({ title: 'Segment Created', description: `"${customName}" would be saved (demo)` });
        setShowBuilder(false);
        setCustomName('');
        setCustomFilters([{ field: 'totalSpent', operator: 'greater_than', value: 100 }]);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/customers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Customer Segments</h1>
                        <p className="text-muted-foreground">
                            Organize customers for targeted marketing campaigns.
                        </p>
                    </div>
                </div>
                <Button onClick={() => setShowBuilder(!showBuilder)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Segment
                </Button>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            AI-Suggested Segments
                        </CardTitle>
                        <CardDescription>
                            Based on your customer data, we recommend these segments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-3">
                            {suggestions.map((s, i) => (
                                <div key={i} className="p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{s.description}</div>
                                    <div className="flex items-center justify-between mt-3">
                                        <Badge variant="secondary">{s.estimatedCount} customers</Badge>
                                        <Button size="sm" variant="ghost">
                                            <Eye className="h-3 w-3 mr-1" /> View
                                        </Button>
                                    </div>
                                    <div className="text-xs text-primary mt-2">{s.reasoning}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Custom Segment Builder */}
            {showBuilder && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Create Custom Segment
                        </CardTitle>
                        <CardDescription>
                            Define filters to create a targeted customer group.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Segment Name</Label>
                            <Input
                                placeholder="e.g., High-Value Evening Shoppers"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Filters</Label>
                            {customFilters.map((filter, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <Select
                                        value={filter.field}
                                        onValueChange={(v) => updateFilter(i, { field: v })}
                                    >
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="totalSpent">Total Spent</SelectItem>
                                            <SelectItem value="orderCount">Order Count</SelectItem>
                                            <SelectItem value="daysSinceLastOrder">Days Inactive</SelectItem>
                                            <SelectItem value="avgOrderValue">Avg Order Value</SelectItem>
                                            <SelectItem value="tier">Tier</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={filter.operator}
                                        onValueChange={(v) => updateFilter(i, { operator: v as any })}
                                    >
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="greater_than">Greater than</SelectItem>
                                            <SelectItem value="less_than">Less than</SelectItem>
                                            <SelectItem value="equals">Equals</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Input
                                        type="number"
                                        className="w-24"
                                        value={filter.value}
                                        onChange={(e) => updateFilter(i, { value: Number(e.target.value) })}
                                    />

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFilter(i)}
                                        disabled={customFilters.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addFilter}>
                                <Plus className="h-3 w-3 mr-1" /> Add Filter
                            </Button>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button onClick={handleSaveCustomSegment}>
                                <Save className="h-4 w-4 mr-2" /> Save Segment
                            </Button>
                            <Button variant="outline" onClick={() => setShowBuilder(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Built-in Segments Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {BUILT_IN_SEGMENTS.map(seg => {
                    const count = segmentCounts[seg.id] || 0;
                    return (
                        <Card
                            key={seg.id}
                            className="cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => handleViewSegment(seg.id)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Badge className={seg.color}>{seg.label}</Badge>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{count}</div>
                                <div className="text-xs text-muted-foreground mt-1">{seg.description}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Summary Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Segment Distribution</CardTitle>
                    <CardDescription>How your customers are distributed across segments</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {BUILT_IN_SEGMENTS.map(seg => {
                            const count = segmentCounts[seg.id] || 0;
                            const total = Object.values(segmentCounts).reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? (count / total) * 100 : 0;

                            return (
                                <div key={seg.id} className="flex items-center gap-3">
                                    <Badge className={`${seg.color} w-24 justify-center`}>{seg.label}</Badge>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground w-16 text-right">
                                        {count} ({percentage.toFixed(0)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
