
// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ProductsClient from './ProductsClient';

export default function ProductsPage() {
  return <ProductsClient />;
}
