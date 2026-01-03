
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Send, Loader2, Mail } from 'lucide-react';
import { testEmailDispatch } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EmailTesterTab() {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('BakedBot AI Test');
    const [body, setBody] = useState('<p>Hello from the <strong>Super Admin Console</strong>.</p>');
    const [fromEmail, setFromEmail] = useState('hello@bakedbot.ai');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ message: string; error?: boolean } | null>(null);

    const handleSend = async () => {
        if (!to) {
            setResult({ message: 'Recipient email is required', error: true });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await testEmailDispatch({ to, subject, body, fromEmail });
            setResult(res);
        } catch (error: any) {
            setResult({ message: error.message || 'Unknown error occurred', error: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Email Dispatch Tester</h2>
                    <p className="text-muted-foreground">Verify transactional email configuration (SendGrid/Mailjet).</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Compose Test Email
                        </CardTitle>
                        <CardDescription>
                            Send a real email to verify your configured provider.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="sender">From Address</Label>
                            <select 
                                id="sender" 
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={fromEmail}
                                onChange={(e) => setFromEmail(e.target.value)}
                            >
                                <option value="hello@bakedbot.ai">hello@bakedbot.ai (General)</option>
                                <option value="team@bakedbot.ai">team@bakedbot.ai (Team)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="to">To Address</Label>
                            <Input 
                                id="to" 
                                placeholder="name@example.com" 
                                value={to} 
                                onChange={(e) => setTo(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input 
                                id="subject" 
                                placeholder="Email Subject" 
                                value={subject} 
                                onChange={(e) => setSubject(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="body">HTML Body</Label>
                            <Textarea 
                                id="body" 
                                placeholder="<p>Email content...</p>" 
                                value={body} 
                                onChange={(e) => setBody(e.target.value)} 
                                rows={6}
                                className="font-mono text-sm"
                            />
                        </div>

                        <Button 
                            className="w-full" 
                            onClick={handleSend} 
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Dispatch Email
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Results Log</CardTitle>
                        <CardDescription>Output from the server-side dispatcher.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <Alert variant={result.error ? "destructive" : "default"} className={result.error ? "" : "border-green-500 bg-green-50 text-green-900"}>
                                {result.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                <AlertTitle>{result.error ? "Dispatch Failed" : "Dispatch Successful"}</AlertTitle>
                                <AlertDescription>
                                    {result.message}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed bg-muted/50 text-sm text-muted-foreground">
                                Ready to send. Log will appear here.
                            </div>
                        )}
                        
                        <div className="mt-6 rounded-md bg-slate-950 p-4 text-xs text-slate-300">
                             <p className="font-semibold text-slate-100 mb-2">Technical Info:</p>
                             <ul className="list-disc pl-4 space-y-1">
                                <li>Provider: <code>src/lib/email/dispatcher.ts</code></li>
                                <li>Action: <code>testEmailDispatch</code></li>
                                <li>Role Required: <code>super_admin</code></li>
                             </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
