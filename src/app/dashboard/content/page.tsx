'use client';

import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import BrandImageGenerator from './components/brand-image-generator';
import ProductDescriptionDisplay from './components/product-description-display';
import ProductDescriptionForm from './components/product-description-form';
import ReviewSummarizer from './components/review-summarizer';

export default function ProductDescriptionGeneratorPage() {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);

  const handleContentGenerated = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }
  
  const handleImageGenerated = (imageUrl: string | null) => {
    setGeneratedContent(prev => ({
        ...(prev ?? { productName: 'Brand Image', description: '' }),
        imageUrl: imageUrl,
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
      <div className="grid grid-cols-1 gap-8 @container lg:grid-cols-2">
        <ProductDescriptionForm onContentGenerated={handleContentGenerated} />
        <div className="flex flex-col gap-8">
            <ProductDescriptionDisplay 
                productDescription={generatedContent}
            />
            <BrandImageGenerator onImageGenerated={handleImageGenerated} />
            <ReviewSummarizer />
        </div>
      </div>
    </div>
  );
}
