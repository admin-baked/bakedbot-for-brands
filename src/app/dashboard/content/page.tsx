
'use client';

import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import ProductDescriptionDisplay from '@/components/product-description-display';
import ProductDescriptionForm from '@/components/product-description-form';
import ReviewSummarizer from '@/components/review-summarizer';
import { useFormState } from 'react-dom';
import { createProductDescription, createSocialMediaImage, type DescriptionFormState, type ImageFormState } from '@/app/dashboard/(main)/content/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, MessageSquare } from 'lucide-react';
import type { Product } from '@/types/domain';
import { useCookieStore } from '@/lib/cookie-storage';
import { demoProducts } from '@/lib/data';
import { useProducts } from '@/hooks/use-products';

const initialDescriptionState: DescriptionFormState = { message: '', data: null, error: false };
const initialImageState: ImageFormState = { message: '', imageUrl: null, error: false };

export default function ProductContentAIPage() {
  const { isDemo } = useCookieStore();
  // In a real app, you would pass the user's brandId here.
  // For this demo, we use 'default' for live data or undefined if not needed.
  const brandId = isDemo ? 'default' : 'default';
  const { products, isLoading: areProductsLoading } = useProducts(brandId);

  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  
  const [descriptionState, descriptionFormAction] = useFormState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction] = useFormState(createSocialMediaImage, initialImageState);
  
  const handleContentUpdate = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }

  const displayProducts = isDemo ? demoProducts : products;

  return (
    <div className="flex flex-col gap-6">
       <Tabs defaultValue="generator" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generator"><PenSquare className="mr-2" /> Content Generator</TabsTrigger>
                <TabsTrigger value="summarizer"><MessageSquare className="mr-2" /> Review Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="generator" className="mt-6">
                 <div className="grid grid-cols-1 gap-8 @container lg:grid-cols-2">
                    <ProductDescriptionForm 
                      onContentUpdate={handleContentUpdate}
                      descriptionFormAction={descriptionFormAction}
                      imageFormAction={imageFormAction}
                      descriptionState={descriptionState}
                      imageState={imageState}
                      products={displayProducts}
                      areProductsLoading={areProductsLoading}
                    />
                    <ProductDescriptionDisplay 
                        productDescription={generatedContent}
                    />
                </div>
            </TabsContent>

            <TabsContent value="summarizer" className="mt-6">
                <ReviewSummarizer products={displayProducts} areProductsLoading={areProductsLoading} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
