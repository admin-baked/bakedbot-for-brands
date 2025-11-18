
'use client';

import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import ProductDescriptionDisplay from '@/app/dashboard/content/components/product-description-display';
import ProductDescriptionForm from '@/app/dashboard/content/components/product-description-form';
import ReviewSummarizer from '@/app/dashboard/content/components/review-summarizer';
import { useFormState } from 'react-dom';
import { createProductDescription, createSocialMediaImage, type DescriptionFormState, type ImageFormState } from '@/app/dashboard/content/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, MessageSquare } from 'lucide-react';
import type { Product } from '@/types/domain';

const initialDescriptionState: DescriptionFormState = { message: '', data: null, error: false };
const initialImageState: ImageFormState = { message: '', imageUrl: null, error: false };

interface ContentAITabProps {
  initialProducts: Product[];
}

export default function ContentAITab({ initialProducts }: ContentAITabProps) {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  
  const [descriptionState, descriptionFormAction] = useFormState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction] = useFormState(createSocialMediaImage, initialImageState);
  
  const handleContentUpdate = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }

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
                      products={initialProducts}
                      areProductsLoading={false}
                    />
                    <ProductDescriptionDisplay 
                        productDescription={generatedContent}
                    />
                </div>
            </TabsContent>

            <TabsContent value="summarizer" className="mt-6">
                <ReviewSummarizer products={initialProducts} areProductsLoading={false} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
