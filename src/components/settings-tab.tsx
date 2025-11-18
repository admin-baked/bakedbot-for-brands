
'use client';

import { type Brand } from '@/types/domain';
import BrandSettingsForm from '@/components/brand-settings-form';
import ChatbotSettingsForm from '@/components/chatbot-settings-form';

interface SettingsTabProps {
    brand: Brand;
}

export default function SettingsTab({ brand }: SettingsTabProps) {
    
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
            Manage your brand identity and chatbot configuration.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <BrandSettingsForm brand={brand} />
        <ChatbotSettingsForm brand={brand} />
      </div>
    </div>
  );
}
