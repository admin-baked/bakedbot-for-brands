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
import { Switch } from '@/components/ui/switch';
import { createCarousel, updateCarousel } from '@/app/actions/carousels';
import { Carousel } from '@/types/carousels';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional(),
    productIds: z.string(), // CSV string for form, converted to array for submit
    displayOrder: z.coerce.number().min(0),
    active: z.boolean().default(true),
});

interface CarouselFormProps {
    initialData?: Carousel;
    orgId: string;
    onSuccess?: (carousel: Carousel) => void;
    onCancel?: () => void;
}

export function CarouselForm({ initialData, orgId, onSuccess, onCancel }: CarouselFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            productIds: initialData?.productIds?.join(', ') || "",
            displayOrder: initialData?.displayOrder || 0,
            active: initialData?.active ?? true,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const productIdsArray = values.productIds.split(',').map(s => s.trim()).filter(Boolean);

            const payload = {
                ...values,
                productIds: productIdsArray
            };

            let result;
            if (initialData) {
                result = await updateCarousel(initialData.id, payload);
            } else {
                result = await createCarousel({ ...payload, orgId });
            }

            if (result.success) {
                toast({
                    title: initialData ? "Carousel Updated" : "Carousel Created",
                    description: "Your changes have been saved.",
                });
                if (onSuccess) onSuccess(initialData ? (initialData as Carousel) : (result as any).data);
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
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Carousel Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Staff Picks" {...field} />
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
                                <Input placeholder="Subtitle displayed below the title" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="productIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product IDs</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Comma separated IDs: prod_123, prod_456" {...field} />
                            </FormControl>
                            <FormDescription>
                                Enter the IDs of products to include in this carousel.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="displayOrder"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Display Order</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="active"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Active</FormLabel>
                                    <FormDescription>
                                        Show on menu
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'Update Carousel' : 'Create Carousel'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
