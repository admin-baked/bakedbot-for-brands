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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBundle, updateBundle } from '@/app/actions/bundles';
import { BundleDeal } from '@/types/bundles';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    description: z.string().optional(),
    type: z.enum(['bogo', 'mix_match', 'percentage', 'fixed_price', 'tiered']),
    status: z.enum(['draft', 'active', 'scheduled', 'expired', 'paused']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
}).refine((data) => {
    // If both dates are provided, start must be before end
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
}, {
    message: "Start date must be before end date",
    path: ["endDate"],
});

interface BundleFormProps {
    initialData?: BundleDeal;
    orgId: string;
    onSuccess?: (bundle: BundleDeal) => void;
    onCancel?: () => void;
}

export function BundleForm({ initialData, orgId, onSuccess, onCancel }: BundleFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
            type: initialData?.type || "mix_match",
            status: initialData?.status || "draft",
            startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
            endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            // Convert string dates to Date objects
            const bundleData = {
                ...values,
                startDate: values.startDate ? new Date(values.startDate) : undefined,
                endDate: values.endDate ? new Date(values.endDate) : undefined,
            };

            let result;
            if (initialData) {
                result = await updateBundle(initialData.id, bundleData);
            } else {
                result = await createBundle({ ...bundleData, orgId, createdBy: 'dispensary' });
            }

            if (result.success) {
                toast({
                    title: initialData ? "Bundle Updated" : "Bundle Created",
                    description: "Your changes have been saved.",
                });
                if (onSuccess) onSuccess(initialData ? (initialData as BundleDeal) : (result as any).data);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Something went wrong. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bundle Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Weekend Warrior Pack" {...field} />
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
                                <Textarea placeholder="Describe the deal..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="mix_match">Mix & Match</SelectItem>
                                        <SelectItem value="bogo">BOGO</SelectItem>
                                        <SelectItem value="percentage">% Off</SelectItem>
                                        <SelectItem value="fixed_price">Fixed Price</SelectItem>
                                        <SelectItem value="tiered">Tiered</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-4">Scheduling (Optional)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Start Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormDescription>Bundle becomes active on this date</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormDescription>Bundle expires on this date</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'Update Bundle' : 'Create Bundle'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
