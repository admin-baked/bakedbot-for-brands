
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Loader2, CheckCircle } from 'lucide-react';
import { subscribeToDropAlert } from '@/server/actions/alerts';

interface DropAlertModalProps {
    zipCode: string;
}

export function DropAlertModal({ zipCode }: DropAlertModalProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        const res = await subscribeToDropAlert(email, zipCode);
        setResult(res);
        setLoading(false);

        if (res.success) {
            setTimeout(() => {
                setOpen(false);
                setResult(null);
                setEmail('');
            }, 3000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto gap-2 border-primary/20 hover:border-primary/50 text-primary">
                    <Bell className="h-4 w-4" />
                    Notify me of fresh drops
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Fresh Drop Alerts
                    </DialogTitle>
                    <DialogDescription>
                        Get notified instantly when top-shelf flower and exclusive deals land in {zipCode}.
                    </DialogDescription>
                </DialogHeader>

                {result?.success ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-100 p-3 rounded-full">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <p className="font-medium text-green-800">{result.message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="col-span-3"
                            />
                        </div>

                        {result && !result.success && (
                            <p className="text-sm text-red-500">{result.message}</p>
                        )}

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                'Notify Me'
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            We respect your inbox. Unsubscribe anytime.
                        </p>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
