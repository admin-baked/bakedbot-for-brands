
'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { summarizeProductReviews } from '@/app/dashboard/content/actions';
import type { ReviewSummaryFormState } from '@/app/dashboard/content/actions';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2, ThumbsUp, ThumbsDown, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/firebase/converters';

const initialState: ReviewSummaryFormState = {
    message: '',
    data: null,
    error: false,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2" />}
            Summarize Reviews
        </Button>
    );
}

interface ReviewSummarizerProps {
    products: Product[] | null;
    areProductsLoading: boolean;
}

export default function ReviewSummarizer({ products, areProductsLoading }: ReviewSummarizerProps) {
    const [state, formAction] = useFormState(summarizeProductReviews, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [selectedProductName, setSelectedProductName] = useState('');
    const { pending } = useFormStatus();


    useEffect(() => {
        if (state.message) {
            if (state.error) {
                toast({ variant: 'destructive', title: 'Error', description: state.message });
            }
        }
    }, [state, toast]);

    const handleSelectChange = (value: string) => {
        const product = products?.find(p => p.id === value);
        setSelectedProductName(product?.name || '');
    };

    return (
        <Card>
            <form ref={formRef} action={formAction}>
                 <input type="hidden" name="productName" value={selectedProductName} />
                <CardHeader>
                    <CardTitle>AI Review Summarizer</CardTitle>
                    <CardDescription>Get instant insights by summarizing all reviews for a specific product.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select name="productId" onValueChange={handleSelectChange} disabled={areProductsLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder={areProductsLoading ? "Loading products..." : "Select a product"} />
                        </SelectTrigger>
                        <SelectContent>
                            {products?.map(product => (
                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
                <CardFooter>
                    <SubmitButton />
                </CardFooter>
            </form>
            {(pending || state.data) && (
                <CardContent className="border-t pt-6 space-y-4">
                     {pending ? (
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p>Reading reviews and generating summary...</p>
                        </div>
                    ) : state.data && (
                        <div className='space-y-4'>
                            <div className='flex items-center gap-2'>
                                <MessageSquare className='h-5 w-5 text-primary' />
                                <h3 className='text-lg font-semibold'>Summary for {selectedProductName}</h3>
                                <Badge variant="secondary">{state.data.reviewCount} reviews</Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground italic">"{state.data.summary}"</p>

                            <Separator />
                            
                            <div className='grid grid-cols-1 @sm:grid-cols-2 gap-4'>
                                <div className='space-y-2'>
                                     <h4 className='font-semibold flex items-center gap-2'><CheckCircle className='h-5 w-5 text-green-500'/> Pros</h4>
                                     <ul className='list-disc pl-5 space-y-1 text-sm'>
                                        {state.data.pros.length > 0 ? state.data.pros.map((pro: string, i: number) => <li key={i}>{pro}</li>) : <li>No common pros found.</li>}
                                     </ul>
                                </div>
                                <div className='space-y-2'>
                                    <h4 className='font-semibold flex items-center gap-2'><XCircle className='h-5 w-5 text-red-500'/> Cons</h4>
                                     <ul className='list-disc pl-5 space-y-1 text-sm'>
                                        {state.data.cons.length > 0 ? state.data.cons.map((con: string, i: number) => <li key={i}>{con}</li>) : <li>No common cons found.</li>}
                                     </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
