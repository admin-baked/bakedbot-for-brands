'use client';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import BrandImageGenerator from './components/brand-image-generator';
import ProductDescriptionDisplay from './components/product-description-display';
import ProductDescriptionForm from './components/product-description-form';
import ReviewSummarizer from './components/review-summarizer';
import { createProductDescription, createSocialMediaImage } from './actions';

export default function ProductDescriptionGeneratorPage() {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  
  // Get the pending states from the form actions
  const [descriptionState, descriptionFormAction] = useFormState(createProductDescription, { message: '', data: null, error: false });
  const [imageState, imageFormAction] = useFormState(createSocialMediaImage, { message: '', imageUrl: null, error: false });

  const handleContentUpdate = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }

  const handleBrandImageGenerated = (imageUrl: string | null) => {
     setGeneratedContent(prev => ({
        ...(prev ?? { productName: 'Brand Image', description: '' }),
        productName: 'Brand Image',
        description: prev?.description || 'AI-generated image for your brand.',
        imageUrl: imageUrl,
        productId: undefined, // Brand images aren't associated with a product
    } as GenerateProductDescriptionOutput & { productId?: string }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Content Suite</h1>
        <p className="text-muted-foreground">
          Generate compelling product descriptions, social media images, and more with the power of AI.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 @container lg:grid-cols-2 xl:grid-cols-3">
        
        <ProductDescriptionForm 
          onContentUpdate={handleContentUpdate}
          descriptionFormAction={descriptionFormAction}
          imageFormAction={imageFormAction}
          descriptionState={descriptionState}
          imageState={imageState}
        />
        
        <div className="flex flex-col gap-8 xl:col-span-2">
            <div className="grid grid-cols-1 @lg:grid-cols-2 gap-8">
              <ProductDescriptionDisplay 
                  productDescription={generatedContent}
                  isDescriptionPending={false}
                  isImagePending={false}
              />
              <BrandImageGenerator onImageGenerated={handleBrandImageGenerated} />
            </div>
            <ReviewSummarizer />
        </div>
      </div>
    </div>
  );
}
