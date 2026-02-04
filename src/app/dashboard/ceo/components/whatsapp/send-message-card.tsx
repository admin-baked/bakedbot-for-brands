'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppMessageAction } from '@/server/actions/whatsapp';

interface SendMessageCardProps {
    sessionConnected: boolean;
}

export function SendMessageCard({ sessionConnected }: SendMessageCardProps) {
    const { toast } = useToast();
    const [to, setTo] = useState('');
    const [message, setMessage] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSend = async () => {
        if (!to || !message) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Phone number and message are required",
            });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await sendWhatsAppMessageAction({
                to,
                message,
                mediaUrl: mediaUrl || undefined,
            });

            setResult(response);

            if (response.success) {
                toast({
                    title: "Message Sent",
                    description: `Message delivered to ${to}`,
                });
                // Clear form
                setTo('');
                setMessage('');
                setMediaUrl('');
            } else {
                toast({
                    variant: "destructive",
                    title: "Send Failed",
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Send WhatsApp Message</CardTitle>
                <CardDescription>Send individual message to a phone number</CardDescription>
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

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                        id="phone"
                        placeholder="+1234567890 (international format)"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        disabled={!sessionConnected}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                        id="message"
                        placeholder="Enter your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        disabled={!sessionConnected}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="media">Media URL (Optional)</Label>
                    <Input
                        id="media"
                        placeholder="https://example.com/image.jpg"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        disabled={!sessionConnected}
                    />
                </div>

                <Button
                    className="w-full"
                    onClick={handleSend}
                    disabled={loading || !sessionConnected}
                >
                    {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                        <><Send className="mr-2 h-4 w-4" /> Send Message</>
                    )}
                </Button>

                {result && (
                    <Alert variant={result.success ? "default" : "destructive"}>
                        {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertDescription>
                            {result.success ? 'Message sent successfully!' : result.error}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
