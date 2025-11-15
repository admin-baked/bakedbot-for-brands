
// This component was incorrectly configured as a route segment.
// The exports for `dynamic` and `revalidate` have been removed to fix a build error.

import ProductsClient from './ProductsClient';

export default function ProductsPage() {
  return <ProductsClient />;
}
