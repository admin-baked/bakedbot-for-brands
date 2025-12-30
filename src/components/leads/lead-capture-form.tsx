'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { captureLead } from '@/app/dashboard/leads/actions';
import { cn } from '@/lib/utils';

// Schema
const leadSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    interest: z.string().min(1, 'Please select an interest'),
    message: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadCaptureFormProps {
    orgId: string;
    orgName: string; // Used for "Connect with [Name]"
    orgType: 'brand' | 'dispensary';
    variant?: 'sidebar' | 'inline'; // Sidebar = compact, inline = wider
}

export function LeadCaptureForm({ orgId, orgName, orgType, variant = 'sidebar' }: LeadCaptureFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors }
    } = useForm<LeadFormData>({
        resolver: zodResolver(leadSchema),
        defaultValues: {
            interest: 'general'
        }
    });

    const onSubmit = async (data: LeadFormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await captureLead(orgId, {
                email: data.email,
                name: data.name,
                phone: data.phone,
                type: 'customer_inquiry', // Default for public form
                source: `${orgType}_page_form`,
                message: `[Interest: ${data.interest}] ${data.message || ''}`
            });

            if (result.success) {
                setIsSuccess(true);
                reset();
            } else {
                setError('Something went wrong. Please try again.');
            }
        } catch (err) {
            console.error('Lead capture error:', err);
            setError('Failed to submit. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className={cn(
                "rounded-2xl p-6 text-center shadow-sm border border-green-100 bg-green-50/50",
                variant === 'sidebar' ? "w-full" : "max-w-md mx-auto"
            )}>
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-green-800 mb-2">Message Sent!</h3>
                <p className="text-green-700 text-sm mb-4">
                    Thanks for connecting with {orgName}. We've received your inquiry and will be in touch soon.
                </p>
                <Button 
                    variant="outline" 
                    onClick={() => setIsSuccess(false)}
                    className="text-green-700 bg-white border-green-200 hover:bg-green-50"
                >
                    Send another message
                </Button>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-white rounded-2xl p-6 shadow-sm border border-slate-200",
            variant === 'sidebar' ? "w-full" : "max-w-2xl mx-auto"
        )}>
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Connect with {orgName}</h3>
                    <p className="text-xs text-slate-500">Ask a question or request info</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-3">
                    <div>
                        <Input 
                            placeholder="Your Name" 
                            {...register('name')} 
                            className={errors.name ? "border-red-300 focus-visible:ring-red-200" : ""}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                        <Input 
                            placeholder="Email Address" 
                            type="email"
                            {...register('email')} 
                            className={errors.email ? "border-red-300 focus-visible:ring-red-200" : ""}
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                        <Input 
                            placeholder="Phone (Optional)" 
                            type="tel"
                            {...register('phone')} 
                        />
                    </div>

                    <div>
                        <Select 
                            onValueChange={(val) => setValue('interest', val)} 
                            defaultValue="general"
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="What is this about?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">General Inquiry</SelectItem>
                                <SelectItem value="product">Product Question</SelectItem>
                                <SelectItem value="hours">Hours / Location</SelectItem>
                                <SelectItem value="deals">Deals & Offers</SelectItem>
                                <SelectItem value="events">Events</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.interest && <p className="text-xs text-red-500 mt-1">{errors.interest.message}</p>}
                    </div>

                    <div>
                        <Textarea 
                            placeholder="How can we help you?" 
                            {...register('message')} 
                            className="min-h-[80px]"
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}

                <Button 
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-800"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            Send Message <Send className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
                
                <p className="text-[10px] text-slate-400 text-center">
                    By submitting, you agree to share this info with {orgName}.
                </p>
            </form>
        </div>
    );
}
