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
import { createHeroSlide, updateHeroSlide } from '@/app/actions/hero-slides';
import { HeroSlide } from '@/types/hero-slides';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    title: z.string().min(2, { message: "Title must be at least 2 characters." }),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    ctaText: z.string().min(1, { message: "CTA text is required." }),
    ctaAction: z.enum(['scroll', 'link', 'none']),
    ctaTarget: z.string().optional(),
    imageUrl: z.string().url('Image URL must be valid').optional().or(z.literal('')),
    backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use #RRGGBB)'),
    textAlign: z.enum(['left', 'center', 'right']),
    active: z.boolean().default(false),
}).refine((data) => {
    // If ctaAction is 'link', ctaTarget must be provided
    if (data.ctaAction === 'link' && !data.ctaTarget) {
        return false;
    }
    return true;
}, {
    message: "Link target is required when action is 'link'",
    path: ["ctaTarget"],
});

interface HeroSlideFormProps {
    initialData?: HeroSlide;
    orgId: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function HeroSlideForm({ initialData, orgId, onSuccess, onCancel }: HeroSlideFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            subtitle: initialData?.subtitle || "",
            description: initialData?.description || "",
            ctaText: initialData?.ctaText || "",
            ctaAction: initialData?.ctaAction || "scroll",
            ctaTarget: initialData?.ctaTarget || "",
            imageUrl: initialData?.imageUrl || "",
            backgroundColor: initialData?.backgroundColor || "#16a34a",
            textAlign: initialData?.textAlign || "left",
            active: initialData?.active || false,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            let result;
            if (initialData) {
                result = await updateHeroSlide(initialData.id, {
                    ...initialData,
                    ...values,
                });
            } else {
                result = await createHeroSlide(orgId, {
                    ...values,
                    orgId,
                    displayOrder: 0,
                } as any);
            }

            if (result.success) {
                toast({
                    title: initialData ? "Slide Updated" : "Slide Created",
                    description: "Your changes have been saved.",
                });
                if (onSuccess) onSuccess();
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
                {/* Title */}
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. 20% OFF ALL FLOWER" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Subtitle */}
                <FormField
                    control={form.control}
                    name="subtitle"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subtitle (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Happy Hour Special" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Description */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Additional details about your promotion..." {...field} rows={2} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Background Color */}
                    <FormField
                        control={form.control}
                        name="backgroundColor"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Background Color</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input
                                            type="color"
                                            {...field}
                                            className="h-10 w-12 p-1 cursor-pointer flex-shrink-0"
                                        />
                                    </FormControl>
                                    <Input
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="#16a34a"
                                        className="flex-1"
                                    />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Text Alignment */}
                    <FormField
                        control={form.control}
                        name="textAlign"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Text Alignment</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Image URL */}
                <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormDescription>Optional background image for the slide</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* CTA Section */}
                <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-4">Call-to-Action</h3>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="ctaText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CTA Button Text</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Shop Flower" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="ctaAction"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CTA Action</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="scroll">Scroll to Section</SelectItem>
                                            <SelectItem value="link">External Link</SelectItem>
                                            <SelectItem value="none">No Action</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {form.watch('ctaAction') === 'scroll' && 'Scroll to a section ID on this page'}
                                        {form.watch('ctaAction') === 'link' && 'Navigate to an external URL'}
                                        {form.watch('ctaAction') === 'none' && 'Display button without action'}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(form.watch('ctaAction') === 'scroll' || form.watch('ctaAction') === 'link') && (
                            <FormField
                                control={form.control}
                                name="ctaTarget"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {form.watch('ctaAction') === 'scroll' ? 'Section ID' : 'URL'}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={form.watch('ctaAction') === 'scroll' ? 'products' : 'https://example.com'}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {form.watch('ctaAction') === 'scroll' && 'ID of the element to scroll to (e.g., "products")'}
                                            {form.watch('ctaAction') === 'link' && 'Full URL to navigate to'}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                </div>

                {/* Active Toggle */}
                <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                            <FormControl>
                                <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4"
                                />
                            </FormControl>
                            <div className="flex-1">
                                <FormLabel>Active</FormLabel>
                                <FormDescription>Show this slide on the public menu</FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'Update Slide' : 'Create Slide'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
