'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DomainSettingsTab() {
    const [domain, setDomain] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        // TODO: Save to Firebase -> /brands/{brandId}/settings/domain
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Custom Domain</CardTitle>
                    <CardDescription>
                        Connect your own domain (e.g., shop.yourbrand.com) to your BakedBot store.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="domain">Domain Name</Label>
                            <Input
                                id="domain"
                                placeholder="e.g. shop.greenvalley.com"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleSave}>
                                {isSaved ? (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Saved
                                    </>
                                ) : (
                                    'Save Domain'
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            DNS Configuration Required
                        </div>
                        <p className="text-muted-foreground">
                            To make your domain work, you need to add a <strong>CNAME</strong> record to your DNS settings.
                        </p>
                        <div className="grid grid-cols-[100px_1fr] gap-2 mt-2">
                            <div className="font-mono text-xs uppercase text-muted-foreground">Type</div>
                            <div className="font-mono text-xs">CNAME</div>
                            <div className="font-mono text-xs uppercase text-muted-foreground">Name/Host</div>
                            <div className="font-mono text-xs">shop (or your subdomain)</div>
                            <div className="font-mono text-xs uppercase text-muted-foreground">Value/Target</div>
                            <div className="font-mono text-xs">cname.bakedbot.ai</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
