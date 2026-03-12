'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { buildLifecycleMessagePreview, type LifecyclePlaybookKind } from '@/lib/customers/lifecycle-playbooks';
import type { CustomerProfile } from '@/types/customers';

interface CustomerMessageSandboxDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerProfile;
    orgName: string;
    defaultPlaybookKind: LifecyclePlaybookKind;
}

export function CustomerMessageSandboxDialog({
    open,
    onOpenChange,
    customer,
    orgName,
    defaultPlaybookKind,
}: CustomerMessageSandboxDialogProps) {
    const [selectedKind, setSelectedKind] = useState<LifecyclePlaybookKind>(defaultPlaybookKind);

    useEffect(() => {
        if (open) {
            setSelectedKind(defaultPlaybookKind);
        }
    }, [defaultPlaybookKind, open]);

    const preview = useMemo(() => buildLifecycleMessagePreview({
        playbookKind: selectedKind,
        customer,
        orgName,
    }), [customer, orgName, selectedKind]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Message Sandbox</DialogTitle>
                    <DialogDescription>
                        Preview personalized email and SMS copy for this customer. Nothing is sent live from this sandbox.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="max-w-xs">
                        <Select value={selectedKind} onValueChange={(value) => setSelectedKind(value as LifecyclePlaybookKind)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="welcome">Welcome Email</SelectItem>
                                <SelectItem value="winback">Win-Back</SelectItem>
                                <SelectItem value="vip">VIP Appreciation</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {preview.personalizationSignals.length > 0 ? preview.personalizationSignals.map((signal) => (
                            <Badge key={signal} variant="secondary">{signal}</Badge>
                        )) : (
                            <Badge variant="outline">General customer context only</Badge>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Email Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <div className="font-medium text-muted-foreground">Subject</div>
                                    <div className="mt-1 text-base font-medium">{preview.emailSubject}</div>
                                </div>
                                <div>
                                    <div className="font-medium text-muted-foreground">Body Preview</div>
                                    <p className="mt-1 leading-6">{preview.emailPreview}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">SMS Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="leading-6">{preview.smsBody}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DialogFooter>
                    <Button asChild>
                        <Link href="/dashboard/playbooks">Open Playbooks</Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
