'use client';

import BrandSettings from "./components/brand-settings";
import BakedBotSettings from "./components/bakedbot-settings";
import ChatbotSettings from "./components/chatbot-settings";
import ThemeSettings from "./components/theme-settings";
import { useStore } from "@/hooks/use-store";
import BrandVoiceSettings from "./components/brand-voice-settings";
import MenuSettings from "./components/menu-settings";
import DataSourceSettings from "./components/data-source-settings";
import EmailSettings from "./components/email-settings";

export default function SettingsPage() {
  const { isCeoMode } = useStore();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application and AI agent settings.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ThemeSettings />
        <BrandSettings />
      </div>
       <div className="grid grid-cols-1 gap-8">
        <MenuSettings />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <DataSourceSettings />
        <BrandVoiceSettings />
      </div>
      <ChatbotSettings />
      {isCeoMode && (
        <div className="space-y-8">
          <EmailSettings />
          <BakedBotSettings />
        </div>
      )}
    </div>
  );
}
