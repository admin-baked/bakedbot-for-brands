import { getVendorBrands } from '@/server/actions/vendor-brands';
import type { VendorBrand } from '@/types/vendor-brands';
import { VendorBrandsClient } from './vendor-brands-client';

export default async function VendorBrandsPage() {
  let brands: VendorBrand[] = [];
  try {
    brands = await getVendorBrands();
  } catch {
    // Not authed or no brands yet — client handles empty state
  }

  return <VendorBrandsClient initialBrands={brands} />;
}
