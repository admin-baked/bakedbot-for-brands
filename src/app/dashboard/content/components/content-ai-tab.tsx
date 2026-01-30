import { useState, useActionState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import ProductDescriptionDisplay from '@/components/product-description-display';
import ProductDescriptionForm from '@/components/product-description-form';
import ReviewSummarizer from '@/components/review-summarizer';
import SeoOptimizer from '@/components/seo-optimizer';
import { createProductDescription, createSocialMediaImage, type DescriptionFormState, type ImageFormState } from '@/app/dashboard/content/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, MessageSquare, Search } from 'lucide-react';
import type { Product } from '@/types/domain';

const initialDescriptionState: DescriptionFormState = { message: '', data: undefined, error: false };
const initialImageState: ImageFormState = { message: '', imageUrl: null, error: false };

interface ContentAITabProps {
  initialProducts: Product[];
  areProductsLoading: boolean;
}

export default function ContentAITab({ initialProducts, areProductsLoading }: ContentAITabProps) {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);

  const [descriptionState, descriptionFormAction] = useActionState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction] = useActionState(createSocialMediaImage, initialImageState);

  const handleContentUpdate = (content: (GenerateProductDescriptionOutput & { productId?: string }) | null) => {
    setGeneratedContent(content);
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator"><PenSquare className="mr-2 h-4 w-4" /> Content Generator</TabsTrigger>
          <TabsTrigger value="seo"><Search className="mr-2 h-4 w-4" /> SEO Optimizer</TabsTrigger>
          <TabsTrigger value="summarizer"><MessageSquare className="mr-2 h-4 w-4" /> Review Insights</TabsTrigger>
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
              areProductsLoading={areProductsLoading}
            />
            <ProductDescriptionDisplay
              productDescription={generatedContent}
            />
          </div>
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <SeoOptimizer products={initialProducts} areProductsLoading={areProductsLoading} />
        </TabsContent>

        <TabsContent value="summarizer" className="mt-6">
          <ReviewSummarizer products={initialProducts} areProductsLoading={areProductsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
