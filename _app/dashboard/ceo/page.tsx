
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataManagerTab from "./components/data-manager-tab";
import AISearchIndexTab from "./components/ai-search-index-tab";
import { useDashboardConfig } from "@/hooks/use-dashboard-config";


export default function CeoDashboardPage() {
  return (
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
  );
}
