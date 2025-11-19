
'use client';

import BrandSettingsForm from '@/app/account/components/brand-settings-form';
import ChatbotSettingsForm from '@/app/account/components/chatbot-settings-form';
import { type Brand } from '@/types/domain';

interface BrandAccountViewProps {
  user: { name?: string | null; email?: string | null, role?: string | null };
  brand: Brand | null;
}

export default function BrandAccountView({ user, brand }: BrandAccountViewProps) {
  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground">
          Manage your profile, brand, and AI settings. You are signed in as {user.email}.
        </p>
      </div>

      {brand ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <BrandSettingsForm brand={brand} />
          <ChatbotSettingsForm brand={brand} />
        </div>
      ) : (
        <p>No brand or dispensary settings available.</p>
      )}
    </div>
  );
}
