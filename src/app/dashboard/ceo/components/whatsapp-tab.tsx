'use client';

/**
 * WhatsApp Tab - Super Users Only
 * Manage WhatsApp sessions & send campaign messages
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MessageCircle, Users, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SessionCard } from './whatsapp/session-card';
import { SendMessageCard } from './whatsapp/send-message-card';
import { CampaignCard } from './whatsapp/campaign-card';
import { MessageHistoryCard } from './whatsapp/message-history-card';
import { getWhatsAppSessionAction } from '@/server/actions/whatsapp';

export default function WhatsAppTab() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [sessionStatus, setSessionStatus] = useState<any>(null);

    const loadSession = async () => {
        setLoading(true);
        try {
            const result = await getWhatsAppSessionAction();
            if (result.success) {
                setSessionStatus(result.data);
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to load session",
                    description: result.error || 'Unknown error',
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || 'Unknown error',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadSession();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <MessageCircle className="h-6 w-6" />
                        WhatsApp Gateway
                    </h2>
                    <p className="text-muted-foreground">
                        Manage WhatsApp messaging and campaigns (Super Admin Only)
                    </p>
                </div>
                <Button variant="outline" onClick={loadSession} disabled={loading}>
                    Refresh
                </Button>
            </div>

            {/* Session Status Banner */}
            <SessionCard status={sessionStatus} onRefresh={loadSession} />

            {/* Main Tabs */}
            <Tabs defaultValue="send" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="send">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Message
                    </TabsTrigger>
                    <TabsTrigger value="campaign">
                        <Users className="h-4 w-4 mr-2" />
                        Bulk Campaign
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="h-4 w-4 mr-2" />
                        Message History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="send">
                    <SendMessageCard sessionConnected={sessionStatus?.connected || false} />
                </TabsContent>

                <TabsContent value="campaign">
                    <CampaignCard sessionConnected={sessionStatus?.connected || false} />
                </TabsContent>

                <TabsContent value="history">
                    <MessageHistoryCard />
                </TabsContent>
            </Tabs>
        </div>
    );
}
