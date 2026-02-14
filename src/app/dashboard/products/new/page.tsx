
// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { ProductForm } from "../components/product-form";
import { createServerClient } from "@/firebase/server-client";
import { requireUser } from "@/server/auth/auth";
import { redirect } from "next/navigation";
import type { Brand } from "@/types/domain";

async function getBrands() {
  const { firestore } = await createServerClient();
  const brandsSnap = await firestore.collection('brands').get();
  if (brandsSnap.empty) {
    return [];
  }
  return brandsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Brand));
}

export default async function NewProductPage() {
  let user;
  let brands: Brand[] = [];

  try {
    user = await requireUser(['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user']);
  } catch {
    redirect('/login');
  }

  // If the user is an owner, we need to fetch all brands so they can choose one.
  if (user.role === 'super_user') {
    brands = await getBrands();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProductForm userRole={user.role} brands={brands} showBackButton />
    </div>
  );
}
