
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
    user = await requireUser(['brand', 'super_user']);
  } catch {
    redirect('/brand-login');
  }

  const brandId = user.brandId;
  if (!brandId && user.role !== 'super_user') {
    // Should not happen if role is brand, but a good safeguard.
    redirect('/dashboard');
  }

  // Next.js 15: params is now a Promise
  const { id } = await params;

  const { firestore } = await createServerClient();
  const productRepo = makeProductRepo(firestore);
  const product = await productRepo.getById(id);

  // Security check: ensure the user is editing a product that belongs to their brand
  if (!product || (user.role !== 'super_user' && product.brandId !== brandId)) {
    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <p className="text-muted-foreground">This product does not exist or you do not have permission to edit it.</p>
        </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProductForm product={serializeProduct(product)} />
    </div>
  );
}
