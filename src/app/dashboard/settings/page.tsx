import ChatbotSettings from "./components/chatbot-settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your AI assistant and other application settings.
        </p>
      </div>

      <ChatbotSettings />
    </div>
  );
}
