'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppCampaignAction } from '@/server/actions/whatsapp';

interface CampaignCardProps {
    sessionConnected: boolean;
}

export function CampaignCard({ sessionConnected }: CampaignCardProps) {
    const { toast } = useToast();
    const [recipients, setRecipients] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSendCampaign = async () => {
        const recipientList = recipients
            .split('\n')
            .map(r => r.trim())
            .filter(Boolean);

        if (recipientList.length === 0 || !message) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Recipients and message are required",
            });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await sendWhatsAppCampaignAction({
                recipients: recipientList,
                message,
                rateLimit: 20, // 20 messages/minute
                batchSize: 5,
            });

            setResult(response.data);

            if (response.success && response.data) {
                const data = response.data as any;
                toast({
                    title: "Campaign Complete",
                    description: `Sent ${data.sent}/${data.total} messages`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Campaign Failed",
                    description: response.error || 'Unknown error',
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

    const recipientCount = recipients.split('\n').filter(Boolean).length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Bulk Campaign</CardTitle>
                <CardDescription>Send messages to multiple recipients with rate limiting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!sessionConnected && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            WhatsApp session not connected. Please connect first.
                        </AlertDescription>
                    </Alert>
                )}

                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Rate Limiting</AlertTitle>
                    <AlertDescription>
                        Messages are sent at 20/minute to avoid WhatsApp bans. Large campaigns may take time.
                    </AlertDescription>
                </Alert>

                <div className="space-y-2">
                    <Label htmlFor="recipients">Recipients (one per line)</Label>
                    <Textarea
                        id="recipients"
                        placeholder={"+1234567890\n+0987654321\n+1122334455"}
                        value={recipients}
                        onChange={(e) => setRecipients(e.target.value)}
                        rows={6}
                        disabled={!sessionConnected}
                    />
                    <p className="text-xs text-muted-foreground">
                        {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="campaign-message">Message</Label>
                    <Textarea
                        id="campaign-message"
                        placeholder="Enter your campaign message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        disabled={!sessionConnected}
                    />
                </div>

                <Button
                    className="w-full"
                    onClick={handleSendCampaign}
                    disabled={loading || !sessionConnected}
                >
                    {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Campaign...</>
                    ) : (
                        <><Users className="mr-2 h-4 w-4" /> Send to {recipientCount} Recipients</>
                    )}
                </Button>

                {result && (
                    <Alert variant={result.sent > 0 ? "default" : "destructive"}>
                        {result.sent > 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertTitle>Campaign Results</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-1">
                                <p>Sent: {result.sent}/{result.total}</p>
                                <p>Failed: {result.failed}</p>
                                {result.errors.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-xs">View Errors</summary>
                                        <ul className="list-disc pl-4 text-xs mt-1">
                                            {result.errors.slice(0, 5).map((err: string, i: number) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                            {result.errors.length > 5 && (
                                                <li>...and {result.errors.length - 5} more</li>
                                            )}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
