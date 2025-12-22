'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    SimProfile,
    SimIntervention,
    SimAssumptions,
} from '@/types/simulation';
import { DISPENSARY_PROFILE, BRAND_PROFILE, getProfileConfig } from '@/types/simulation-profiles';
import { createScenario, updateScenario } from '../actions';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

// ==========================================
// Form Schema
// ==========================================

const scenarioSchema = z.object({
    name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
    description: z.string().optional(),
    profile: z.enum(['DISPENSARY', 'BRAND']),
    horizonDays: z.coerce.number().min(7).max(180),
});

type ScenarioFormValues = z.infer<typeof scenarioSchema>;

// ==========================================
// Scenario Form Component
// ==========================================

interface ScenarioFormProps {
    initialData?: {
        id: string;
        name: string;
        description?: string;
        profile: SimProfile;
        horizonDays: number;
        interventions: SimIntervention[];
        assumptions: SimAssumptions;
    };
    mode: 'create' | 'edit';
}

export function ScenarioForm({ initialData, mode }: ScenarioFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // State for complex fields not managed by react-hook-form directly
    const [interventions, setInterventions] = useState<SimIntervention[]>(initialData?.interventions || []);
    const [assumptions, setAssumptions] = useState<SimAssumptions>(
        initialData?.assumptions || DISPENSARY_PROFILE.defaultAssumptions
    );

    const form = useForm<ScenarioFormValues>({
        resolver: zodResolver(scenarioSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            profile: initialData?.profile || 'DISPENSARY',
            horizonDays: initialData?.horizonDays || 30,
        },
    });

    // Use profile to set defaults if changed
    const selectedProfile = form.watch('profile');

    const onSubmit = (values: ScenarioFormValues) => {
        startTransition(async () => {
            try {
                if (mode === 'create') {
                    await createScenario({
                        ...values,
                        profile: values.profile as SimProfile,
                        interventions,
                        assumptions,
                    });
                    toast({ title: 'Scenario Created', description: 'Redirecting to hub...' });
                    router.push('/dashboard/simulation');
                } else if (initialData) {
                    await updateScenario(initialData.id, {
                        ...values,
                        interventions,
                        assumptions,
                    });
                    toast({ title: 'Scenario Updated', description: 'Changes saved.' });
                    router.push('/dashboard/simulation');
                }
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Something went wrong'
                });
            }
        });
    };

    const addIntervention = (type: string) => {
        const newIntervention: any = { type };

        // Defaults based on type
        if (type === 'PriceChange') {
            newIntervention.scope = { kind: 'category', category: 'vapes' };
            newIntervention.mode = 'percent';
            newIntervention.value = -10;
        } else if (type === 'Promotion') {
            newIntervention.promoType = '%off';
            newIntervention.value = 10;
            newIntervention.eligibility = { categories: ['vapes'] };
        } else if (type === 'TradeSpend') {
            newIntervention.budgetTotal = 5000;
            newIntervention.mechanism = 'percent_off_funding';
            newIntervention.allocation = {};
        }

        setInterventions([...interventions, newIntervention]);
    };

    const removeIntervention = (index: number) => {
        const newInvs = [...interventions];
        newInvs.splice(index, 1);
        setInterventions(newInvs);
    };

    const config = getProfileConfig(selectedProfile as SimProfile);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Scenario Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Summer Price Drop" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="What hypothesis are you testing?"
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="profile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Profile</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                disabled={mode === 'edit'}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select profile" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="DISPENSARY">Dispensary</SelectItem>
                                                    <SelectItem value="BRAND">Brand</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                {field.value === 'DISPENSARY'
                                                    ? 'Simulate store performance & margin.'
                                                    : 'Simulate sell-through at partners.'}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="horizonDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Horizon (Days)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormDescription>Duration of simulation.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Assumptions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <FormLabel>Price Elasticity</FormLabel>
                                <Select
                                    value={assumptions.elasticityStrength}
                                    onValueChange={(v: any) => setAssumptions({ ...assumptions, elasticityStrength: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low (Inelastic)</SelectItem>
                                        <SelectItem value="mid">Mid (Normal)</SelectItem>
                                        <SelectItem value="high">High (Elastic)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[0.8rem] text-muted-foreground">
                                    How sensitive customers are to price changes.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <FormLabel>Competitor Pressure</FormLabel>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={assumptions.competitorPressureSensitivity}
                                        onChange={(e) => setAssumptions({
                                            ...assumptions,
                                            competitorPressureSensitivity: parseFloat(e.target.value)
                                        })}
                                    />
                                </div>
                                <p className="text-[0.8rem] text-muted-foreground">
                                    0 = Ignore competitors, 1 = Highly sensitive.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <FormLabel>Population Size Override</FormLabel>
                                <Input
                                    type="number"
                                    placeholder="Default (500)"
                                    value={assumptions.customerPopulationSize || ''}
                                    onChange={(e) => setAssumptions({
                                        ...assumptions,
                                        customerPopulationSize: e.target.value ? parseInt(e.target.value) : undefined
                                    })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Interventions</CardTitle>
                        <div className="flex gap-2">
                            {config.allowedInterventionTypes.includes('PriceChange') && (
                                <Button type="button" variant="outline" size="sm" onClick={() => addIntervention('PriceChange')}>
                                    + Price Change
                                </Button>
                            )}
                            {config.allowedInterventionTypes.includes('Promotion') && (
                                <Button type="button" variant="outline" size="sm" onClick={() => addIntervention('Promotion')}>
                                    + Promotion
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {interventions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                No interventions added. This will run a baseline simulation.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {interventions.map((inv, idx) => (
                                    <div key={idx} className="flex gap-4 items-start p-4 border rounded-lg bg-muted/20">
                                        <div className="flex-1 grid gap-4 md:grid-cols-3">
                                            <div>
                                                <label className="text-xs font-semibold uppercase text-muted-foreground">Type</label>
                                                <div className="font-medium">{inv.type}</div>
                                            </div>

                                            {/* Simple dynamic fields for MVP */}
                                            {inv.type === 'PriceChange' && (
                                                <>
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Scope</label>
                                                        <Input
                                                            className="h-8 mt-1"
                                                            value={(inv as any).scope?.category || ''}
                                                            placeholder="Category (e.g. vapes)"
                                                            onChange={(e) => {
                                                                const newInvs = [...interventions];
                                                                (newInvs[idx] as any).scope.category = e.target.value;
                                                                setInterventions(newInvs);
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Value (%)</label>
                                                        <Input
                                                            className="h-8 mt-1"
                                                            type="number"
                                                            value={(inv as any).value}
                                                            onChange={(e) => {
                                                                const newInvs = [...interventions];
                                                                (newInvs[idx] as any).value = parseFloat(e.target.value);
                                                                setInterventions(newInvs);
                                                            }}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {inv.type === 'Promotion' && (
                                                <>
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Promo Type</label>
                                                        <div className="font-medium mt-1">{(inv as any).promoType}</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Value</label>
                                                        <Input
                                                            className="h-8 mt-1"
                                                            type="number"
                                                            value={(inv as any).value}
                                                            onChange={(e) => {
                                                                const newInvs = [...interventions];
                                                                (newInvs[idx] as any).value = parseFloat(e.target.value);
                                                                setInterventions(newInvs);
                                                            }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => removeIntervention(idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'create' ? 'Create Scenario' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
