
'use client';

import type { Product } from '@/types/domain';
import ContentAITab from './components/content-ai-tab';


interface PageClientProps {
  products: Product[];
  areProductsLoading: boolean;
}

export default function PageClient({ products, areProductsLoading }: PageClientProps) {
  return (
       <ContentAITab initialProducts={products} areProductsLoading={areProductsLoading} />
  );
}
