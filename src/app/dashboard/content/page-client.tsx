'use client';

import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import ProductDescriptionDisplay from '@/components/product-description-display';
import ProductDescriptionForm from '@/components/product-description-form';
import ReviewSummarizer from '@/components/review-summarizer';
import { useFormState } from 'react-dom';
import { createProductDescription, createSocialMediaImage, type DescriptionFormState, type ImageFormState } from '@/app/dashboard/content/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, MessageSquare } from 'lucide-react';
import type { Product } from '@/types/domain';

const initialDescriptionState: DescriptionFormState = { message: '', data: undefined, error: false };
const initialImageState: ImageFormState = { message: '', imageUrl: null, error: false };

interface PageClientProps {
  products: Product[];
  areProductsLoading: boolean;
}

export default function PageClient({ products, areProductsLoading }: PageClientProps) {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  
  const [descriptionState, descriptionFormAction] = useFormState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction] = useFormState(createSocialMediaImage, initialImageState);
  
  const handleContentUpdate = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }

  return (
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
                      products={products}
                      areProductsLoading={areProductsLoading}
                    />
                    <ProductDescriptionDisplay 
                        productDescription={generatedContent}
                    />
                </div>
            </TabsContent>

            <TabsContent value="summarizer" className="mt-6">
                <ReviewSummarizer products={products} areProductsLoading={areProductsLoading} />
            </TabsContent>
        </Tabs>
  );
}
