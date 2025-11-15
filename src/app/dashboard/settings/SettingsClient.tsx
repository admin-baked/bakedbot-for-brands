
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Paintbrush, Bot, SlidersHorizontal, Database, Languages, Mail, KeyRound } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function SettingsClient() {
  const { isCeoMode } = useStore();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'theme';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application and AI agent settings.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <TabsTrigger value="theme"><Paintbrush className="mr-2" /> Theme</TabsTrigger>
          <TabsTrigger value="menu"><SlidersHorizontal className="mr-2" /> Menu</TabsTrigger>
          <TabsTrigger value="chatbot"><Bot className="mr-2" /> Chatbot</TabsTrigger>
          <TabsTrigger value="data"><Database className="mr-2" /> Data</TabsTrigger>
          <TabsTrigger value="brand-voice"><Languages className="mr-2" /> Brand</TabsTrigger>
          {isCeoMode && <TabsTrigger value="email"><Mail className="mr-2" /> Email</TabsTrigger>}
          {isCeoMode && <TabsTrigger value="api"><KeyRound className="mr-2" /> API</TabsTrigger>}
        </TabsList>

        <TabsContent value="theme" className="mt-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <ThemeSettings />
                <BrandSettings />
            </div>
        </TabsContent>
        <TabsContent value="menu" className="mt-6">
            <MenuSettings />
        </TabsContent>
        <TabsContent value="chatbot" className="mt-6">
            <ChatbotSettings />
        </TabsContent>
        <TabsContent value="data" className="mt-6">
            <DataSourceSettings />
        </TabsContent>
        <TabsContent value="brand-voice" className="mt-6">
            <BrandVoiceSettings />
        </TabsContent>
        {isCeoMode && (
          <TabsContent value="email" className="mt-6">
            <EmailSettings />
          </TabsContent>
        )}
        {isCeoMode && (
          <TabsContent value="api" className="mt-6">
            <BakedBotSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
