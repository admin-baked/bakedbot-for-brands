
import BrandSettings from "./components/brand-settings";
import BakedBotSettings from "./components/bakedbot-settings";
import ChatbotSettings from "./components/chatbot-settings";
import ProductImportSettings from "./components/product-import-settings";
import ThemeSettings from "./components/theme-settings";
import BrandVoiceSettings from "./components/brand-voice-settings";

export default function SettingsPage() {
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
      <ChatbotSettings />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductImportSettings />
        <BrandVoiceSettings />
      </div>
      <BakedBotSettings />
    </div>
  );
}
