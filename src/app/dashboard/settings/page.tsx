
// src/app/dashboard/settings/page.tsx
import { createServerClient } from '@/firebase/server-client';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import BrandSettingsForm from '@/app/account/components/brand-settings-form';
import ChatbotSettingsForm from '@/app/account/components/chatbot-settings-form';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsPage() {
  let user;
  try {
    user = await requireUser(['brand', 'owner']);
  } catch (error) {
    return redirect('/brand-login');
  }

  const brandId = user.brandId;
  if (!brandId) {
    return <p>Your account is not associated with a brand.</p>;
  }

  const { firestore } = await createServerClient();
  const brandRepo = makeBrandRepo(firestore);
  const brand = await brandRepo.getById(brandId);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <BrandSettingsForm brand={brand} />
      <ChatbotSettingsForm brand={brand} />
    </div>
  );
}

