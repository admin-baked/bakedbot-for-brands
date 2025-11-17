
'use client';
export const dynamic = 'force-dynamic';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import ProductDescriptionDisplay from './components/product-description-display';
import ProductDescriptionForm from './components/product-description-form';
import SocialImageForm from './components/social-image-form';
import ReviewSummarizer from './components/review-summarizer';
import { createProductDescription, createSocialMediaImage, type DescriptionFormState, type ImageFormState } from './actions';
import { useMenuData } from '@/hooks/use-demo-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';


const initialDescriptionState: DescriptionFormState = { message: '', data: null, error: false };
const initialImageState: ImageFormState = { message: '', imageUrl: null, error: false };


export default function ProductContentGeneratorPage() {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  
  const [descriptionState, descriptionFormAction] = useFormState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction] = useFormState(createSocialMediaImage, initialImageState);
  
  // Get product data for pre-filling forms
  const { products } = useMenuData();
  const areProductsLoading = !products;

  const handleContentUpdate = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Content Suite</h1>
        <p className="text-muted-foreground">
          Generate compelling product descriptions, social media images, and analyze customer reviews.
        </p>
      </div>

       <Tabs defaultValue="generator" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generator"><PenSquare className="mr-2" /> Content Generator</TabsTrigger>
                <TabsTrigger value="summarizer"><MessageSquare className="mr-2" /> Review Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="generator" className="mt-6">
                 <div className="grid grid-cols-1 gap-8 @container lg:grid-cols-2">
                    <div className="flex flex-col gap-8">
                       <ProductDescriptionForm 
                         onContentUpdate={handleContentUpdate}
                         formAction={descriptionFormAction}
                         state={descriptionState}
                         products={products}
                         areProductsLoading={areProductsLoading}
                       />
                       <Separator />
                        <SocialImageForm
                          onContentUpdate={handleContentUpdate}
                          formAction={imageFormAction}
                          state={imageState}
                        />
                    </div>
                    <ProductDescriptionDisplay 
                        productDescription={generatedContent}
                    />
                </div>
            </TabsContent>

            <TabsContent value="summarizer" className="mt-6">
                <ReviewSummarizer products={products} areProductsLoading={areProductsLoading} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
