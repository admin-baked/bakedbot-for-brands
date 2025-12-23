import Chatbot from '@/components/chatbot';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AccountManagementTab } from '@/components/admin/account-management-tab';
import FootTrafficTab from '@/app/dashboard/ceo/components/foot-traffic-tab';
import { MessageSquare, Users, Globe } from 'lucide-react';

export default function AgentInterface() {
    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-6xl mx-auto w-full p-4 space-y-6">
            <Tabs defaultValue="chat" className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-black tracking-tight uppercase">Big Worm HQ</h1>
                    <TabsList>
                        <TabsTrigger value="chat" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            HQ Chat
                        </TabsTrigger>
                        <TabsTrigger value="accounts" className="gap-2">
                            <Users className="h-4 w-4" />
                            Accounts
                        </TabsTrigger>
                        <TabsTrigger value="traffic" className="gap-2">
                            <Globe className="h-4 w-4" />
                            Foot Traffic
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0">
                    <TabsContent value="chat" className="h-full m-0">
                        <div className="relative w-full h-full min-h-[600px] border rounded-xl overflow-hidden shadow-sm bg-background">
                            <Chatbot
                                isSuperAdmin={true}
                                initialOpen={true}
                                positionStrategy="relative"
                                className="hidden" 
                                windowClassName="w-full h-full shadow-none border-0"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="accounts" className="h-full m-0 overflow-auto">
                        <AccountManagementTab />
                    </TabsContent>

                    <TabsContent value="traffic" className="h-full m-0 overflow-auto">
                        <FootTrafficTab />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
