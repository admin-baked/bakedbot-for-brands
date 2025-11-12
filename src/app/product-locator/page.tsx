// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ProductLocatorClient from './ProductLocatorClient';

export default function ProductLocatorPage() {
  return <ProductLocatorClient />;
}
