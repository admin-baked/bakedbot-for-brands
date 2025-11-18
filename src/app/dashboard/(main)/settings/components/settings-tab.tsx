'use client';

import { type Brand } from '@/types/domain';
import BrandSettingsForm from './brand-settings-form';
import ChatbotSettingsForm from './chatbot-settings-form';

interface SettingsTabProps {
    brand: Brand;
}

export default function SettingsTab({ brand }: SettingsTabProps) {
    
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <BrandSettingsForm brand={brand} />
        <ChatbotSettingsForm brand={brand} />
      </div>
    </div>
  );
}
