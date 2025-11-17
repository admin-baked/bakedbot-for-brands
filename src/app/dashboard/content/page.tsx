
'use client';
export const dynamic = 'force-dynamic';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import type { GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import ProductDescriptionDisplay from './components/product-description-display';
import ProductDescriptionForm from './components/product-description-form';
import ReviewSummarizer from './components/review-summarizer';
import { createProductDescription, createSocialMediaImage, type DescriptionFormState, type ImageFormState } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, MessageSquare } from 'lucide-react';
import { useCookieStore } from '@/lib/cookie-storage';
import { demoProducts } from '@/lib/data';
import { makeProductRepo } from '@/server/repos/productRepo';
import { useFirebase } from '@/firebase/provider';
import { Product } from '@/types/domain';


const initialDescriptionState: DescriptionFormState = { message: '', data: null, error: false };
const initialImageState: ImageFormState = { message: '', imageUrl: null, error: false };


export default function ProductContentGeneratorPage() {
  const [generatedContent, setGeneratedContent] = useState<(GenerateProductDescriptionOutput & { productId?: string }) | null>(null);
  
  const [descriptionState, descriptionFormAction] = useFormState(createProductDescription, initialDescriptionState);
  const [imageState, imageFormAction] = useFormState(createSocialMediaImage, initialImageState);
  
  const { isDemo } = useCookieStore();
  const { firestore } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [areProductsLoading, setAreProductsLoading] = useState(true);

  useState(() => {
    if (isDemo) {
        setProducts(demoProducts);
        setAreProductsLoading(false);
    } else if (firestore) {
        const productRepo = makeProductRepo(firestore as any);
        productRepo.getAllByBrand('default').then(p => { // Assuming brand 'default' for now
            setProducts(p);
            setAreProductsLoading(false);
        });
    }
  });

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
    </div>
  );
}
