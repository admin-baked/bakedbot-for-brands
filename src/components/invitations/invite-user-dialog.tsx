'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createInvitationAction } from '@/server/actions/invitations';
import { Loader2, Mail, Copy, Check } from 'lucide-react';
import { CreateInvitationSchema } from '@/types/invitation';

interface InviteUserDialogProps {
    orgId?: string; // Optional context
    allowedRoles: ('brand' | 'dispensary' | 'super_admin' | 'customer')[];
    onInviteSent?: () => void;
    trigger?: React.ReactNode;
}

export function InviteUserDialog({ orgId, allowedRoles, onInviteSent, trigger }: InviteUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof CreateInvitationSchema>>({
        resolver: zodResolver(CreateInvitationSchema),
        defaultValues: {
            email: '',
            role: allowedRoles[0],
            targetOrgId: orgId
        }
    });

    const onSubmit = async (data: z.infer<typeof CreateInvitationSchema>) => {
        setIsLoading(true);
        try {
            const res = await createInvitationAction(data);
            if (res.success && res.link) {
                toast({ title: 'Invitation Created', description: 'Share the link below with the user.' });
                // Construct full URL
                const fullLink = `${window.location.origin}${res.link}`;
                setInviteLink(fullLink);
                onInviteSent?.();
            } else {
                toast({ title: 'Error', description: res.message, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to create invitation.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const copyLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast({ title: 'Copied', description: 'Link copied to clipboard.' });
        }
    };

    const reset = () => {
        setInviteLink(null);
        form.reset();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val ? reset() : setOpen(true)}>
            <DialogTrigger asChild>
                {trigger || <Button><Mail className="mr-2 h-4 w-4"/> Invite User</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite a User</DialogTitle>
                    <DialogDescription>
                        Send an invitation link to join your team.
                    </DialogDescription>
                </DialogHeader>

                {inviteLink ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-md break-all text-sm font-mono border">
                            {inviteLink}
                        </div>
                        <Button onClick={copyLink} className="w-full">
                            <Copy className="mr-2 h-4 w-4" /> Copy Link
                        </Button>
                        <Button variant="ghost" onClick={reset} className="w-full">
                            Close
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input placeholder="colleague@example.com" {...form.register('email')} />
                            {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select 
                                onValueChange={(val) => form.setValue('role', val as any)}
                                defaultValue={allowedRoles[0]}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedRoles.map(role => (
                                        <SelectItem key={role} value={role}>
                                            {role.replace('_', ' ').toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <input type="hidden" {...form.register('targetOrgId')} value={orgId} />

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Invitation
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
