import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataManagerTab from "./components/data-manager-tab";
import AISearchIndexTab from "./components/ai-search-index-tab";

export default function CeoDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-muted-foreground">
                Manage data and AI features. Use these tools with caution.
            </p>
        </div>
        <Tabs defaultValue="data-manager">
            <TabsList>
                <TabsTrigger value="data-manager">Data Manager</TabsTrigger>
                <TabsTrigger value="ai-search">AI Search Index</TabsTrigger>
            </TabsList>
            <TabsContent value="data-manager" className="mt-6">
                <DataManagerTab />
            </TabsContent>
            <TabsContent value="ai-search" className="mt-6">
                <AISearchIndexTab />
            </TabsContent>
        </Tabs>
    </div>
  );
}
