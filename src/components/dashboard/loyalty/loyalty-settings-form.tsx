'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { updateLoyaltySettings } from '@/app/actions/loyalty';
import { LoyaltySettings, LoyaltyTier } from '@/types/customers';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
    pointsPerDollar: z.coerce.number().min(0.1).max(100),
    equityMultiplier: z.coerce.number().min(1).max(5),
});

interface LoyaltySettingsFormProps {
    initialData: LoyaltySettings;
    orgId: string;
}

export function LoyaltySettingsForm({ initialData, orgId }: LoyaltySettingsFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            pointsPerDollar: initialData.pointsPerDollar,
            equityMultiplier: initialData.equityMultiplier,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const payload: LoyaltySettings = {
                ...initialData,
                ...values,
            };

            const result = await updateLoyaltySettings(orgId, payload);

            if (result.success) {
                toast({
                    title: "Settings Saved",
                    description: "Loyalty program updated.",
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Something went wrong.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Point Configuration</h3>
                    <FormField
                        control={form.control}
                        name="pointsPerDollar"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Points per $1 Spent: {field.value}</FormLabel>
                                <FormControl>
                                    <Slider
                                        min={0.1}
                                        max={10}
                                        step={0.1}
                                        value={[field.value || 0]}
                                        onValueChange={(vals) => field.onChange(vals[0])}
                                    />
                                </FormControl>
                                <FormDescription>
                                    How many points customers earn for every dollar spent.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="equityMultiplier"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Equity Multiplier: {field.value}x</FormLabel>
                                <FormControl>
                                    <Slider
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={[field.value || 1]}
                                        onValueChange={(vals) => field.onChange(vals[0])}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Boost points for equity-qualified customers.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Tiers (Read Only)</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        {initialData.tiers.map((tier) => (
                            <div key={tier.id} className="p-4 border rounded-lg bg-card" style={{ borderTopWidth: 4, borderTopColor: tier.color }}>
                                <h4 className="font-semibold">{tier.name}</h4>
                                <p className="text-sm text-muted-foreground">{tier.threshold} Points</p>
                                <ul className="mt-2 text-xs space-y-1">
                                    {tier.benefits.map((benefit, i) => (
                                        <li key={i}>• {benefit}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Contact support to customize tiers.</p>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Form>
    );
}
