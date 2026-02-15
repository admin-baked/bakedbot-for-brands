
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { ProductForm } from '../../components/product-form';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import type { Product } from '@/types/domain';

// Serialize Firestore Timestamp objects to plain objects for Client Components
function serializeProduct(product: Product): Product {
  const serialized: any = { ...product };

  // Serialize all Firestore Timestamp fields (defensive check for any timestamp-like objects)
  Object.keys(serialized).forEach(key => {
    const value = serialized[key];
    if (value && typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
      // Convert Firestore Timestamp to ISO string
      serialized[key] = new Date(value._seconds * 1000).toISOString();
    }
  });

  return serialized as Product;
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser(['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user']);
  } catch {
    redirect('/login');
  }

  // Get org ID - for brands use brandId, for dispensaries use orgId/locationId
  const orgId = user.brandId || (user as any).orgId || (user as any).currentOrgId || user.locationId;
  if (!orgId && user.role !== 'super_user') {
    // No org context found
    redirect('/dashboard');
  }

  // Next.js 15: params is now a Promise
  const { id } = await params;

  const { firestore } = await createServerClient();
  const productRepo = makeProductRepo(firestore);
  const product = await productRepo.getById(id);

  // Check if product exists first
  if (!product) {
    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <p className="text-muted-foreground">This product does not exist.</p>
        </div>
    );
  }

  // Security check: ensure the user is editing a product that belongs to their org
  const hasAccess = user.role === 'super_user' ||
    product.brandId === orgId ||
    (product as any).dispensaryId === orgId;
  if (!hasAccess) {
    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to edit this product.</p>
        </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProductForm product={serializeProduct(product)} showBackButton />
    </div>
  );
}
