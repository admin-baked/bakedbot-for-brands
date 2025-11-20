
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataManagerTab from "./components/data-manager-tab";
import AISearchIndexTab from "./components/ai-search-index-tab";
import CouponManagerTab from "./components/coupon-manager-tab";

export default function CeoDashboardPage() {
  return (
        <Tabs defaultValue="data-manager">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="data-manager">Data Manager</TabsTrigger>
                <TabsTrigger value="ai-search">AI Search Index</TabsTrigger>
                <TabsTrigger value="coupons">Coupon Manager</TabsTrigger>
            </TabsList>
            <TabsContent value="data-manager" className="mt-6">
                <DataManagerTab />
            </TabsContent>
            <TabsContent value="ai-search" className="mt-6">
                <AISearchIndexTab />
            </TabsContent>
            <TabsContent value="coupons" className="mt-6">
                <CouponManagerTab />
            </TabsContent>
        </Tabs>
  );
}
