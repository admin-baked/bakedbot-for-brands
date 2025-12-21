'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, LayoutGrid, Plug } from "lucide-react";

interface AccountTabsProps {
    defaultValue?: string;
    children: React.ReactNode;
}

export function AccountTabs({ defaultValue = "profile", children }: AccountTabsProps) {
    return (
        <Tabs defaultValue={defaultValue} className="w-full space-y-6">
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-lg">
                <TabsTrigger
                    value="profile"
                    className="flex-1 max-w-[200px] gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm py-2"
                >
                    <User className="h-4 w-4" />
                    Profile
                </TabsTrigger>
                <TabsTrigger
                    value="subscription"
                    className="flex-1 max-w-[200px] gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm py-2"
                >
                    <CreditCard className="h-4 w-4" />
                    Subscription
                </TabsTrigger>
                <TabsTrigger
                    value="integrations"
                    className="flex-1 max-w-[200px] gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm py-2"
                >
                    <Plug className="h-4 w-4" />
                    Integrations
                </TabsTrigger>
            </TabsList>
            {children}
        </Tabs>
    );
}
