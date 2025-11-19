
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { ProductForm } from '../../components/product-form';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const { auth, firestore } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) redirect('/brand-login');

  let decodedToken;
  try {
    decodedToken = await auth.verifySessionCookie(sessionCookie, true);
  } catch {
    redirect('/brand-login');
  }

  const brandId = decodedToken.brandId;
  const productRepo = makeProductRepo(firestore);
  const product = await productRepo.getById(params.id);

  // Security check: ensure the user is editing a product that belongs to their brand
  if (!product || product.brandId !== brandId) {
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
