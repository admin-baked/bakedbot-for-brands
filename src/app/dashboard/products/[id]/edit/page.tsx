
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { ProductForm } from '../../components/product-form';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser(['brand', 'owner']);
  } catch {
    redirect('/brand-login');
  }

  const brandId = user.brandId;
  if (!brandId && user.role !== 'owner') {
    // Should not happen if role is brand, but a good safeguard.
    redirect('/dashboard');
  }
  
  const { firestore } = await createServerClient();
  const productRepo = makeProductRepo(firestore);
  const product = await productRepo.getById(params.id);

  // Security check: ensure the user is editing a product that belongs to their brand
  if (!product || (user.role !== 'owner' && product.brandId !== brandId)) {
    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <p className="text-muted-foreground">This product does not exist or you do not have permission to edit it.</p>
        </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProductForm product={product} />
    </div>
  );
}
