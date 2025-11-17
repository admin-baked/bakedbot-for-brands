'use client';

import { type Brand } from '@/types/domain';
import BrandSettingsForm from './components/brand-settings-form';
import ChatbotSettingsForm from './components/chatbot-settings-form';

interface SettingsPageClientProps {
    brand: Brand;
}

export default function SettingsPageClient({ brand }: SettingsPageClientProps) {
    
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your brand identity and AI configurations.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <BrandSettingsForm brand={brand} />
        <ChatbotSettingsForm brand={brand} />
      </div>
    </div>
  );
}
