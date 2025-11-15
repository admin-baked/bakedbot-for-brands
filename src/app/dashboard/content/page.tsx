'use client';
export const dynamic = 'force-dynamic';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import ProductDescriptionDisplay from './components/product-description-display';
import ProductDescriptionForm from './components/product-description-form';
import ReviewSummarizer from './components/review-summarizer';
import { createProductDescription, createSocialMediaImage, type DescriptionFormState, type ImageFormState } from './actions';
import { useMenuData } from '@/hooks/use-menu-data';

const initialDescriptionState: DescriptionFormState = { message: '', data: null, error: false };
const initialImageState: ImageFormState = { message: '', imageUrl: null, error: false };


export default function ProductContentGeneratorPage() {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  
  const [descriptionState, descriptionFormAction] = useFormState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction] = useFormState(createSocialMediaImage, initialImageState);
  
  const { pending: isDescriptionPending } = useFormStatus();
  const { pending: isImagePending } = useFormStatus();


  // Get product data
  const { products, isLoading: areProductsLoading } = useMenuData();

  const handleContentUpdate = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Content Suite</h1>
        <p className="text-muted-foreground">
          Generate compelling product descriptions, social media images, and more with the power of AI.
        </p>
      </div>
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
        
        <div className="flex flex-col gap-8">
             <ProductDescriptionDisplay 
                  productDescription={generatedContent}
                  isDescriptionPending={isDescriptionPending}
                  isImagePending={isImagePending}
              />
            <ReviewSummarizer products={products} areProductsLoading={areProductsLoading}/>
        </div>
      </div>
    </div>
  );
}
