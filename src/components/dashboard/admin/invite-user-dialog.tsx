'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Copy, Check, UserPlus, Mail, Building2, Store } from 'lucide-react';

import { inviteUser } from '@/app/actions/admin/users';
import { createInvitationAction } from '@/server/actions/invitations';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ROLES, getInviteAllowedRoles, isBrandRole, type UserRole } from '@/types/roles';

const ROLE_CONFIG: Record<string, { label: string; description: string; requiresBusiness: boolean; icon: 'brand' | 'dispensary' | 'user' }> = {
    super_user: { label: 'Super Admin', description: 'Full platform access', requiresBusiness: false, icon: 'user' },
    brand_admin: { label: 'Brand Admin', description: 'Brand owner with full access', requiresBusiness: true, icon: 'brand' },
    brand_member: { label: 'Brand Team Member', description: 'Brand team member', requiresBusiness: true, icon: 'brand' },
    brand: { label: 'Brand (Legacy)', description: 'Legacy brand role', requiresBusiness: true, icon: 'brand' },
    dispensary_admin: { label: 'Dispensary Admin', description: 'Dispensary owner', requiresBusiness: true, icon: 'dispensary' },
    dispensary_staff: { label: 'Dispensary Staff', description: 'Dispensary employee', requiresBusiness: true, icon: 'dispensary' },
    dispensary: { label: 'Dispensary (Legacy)', description: 'Legacy dispensary role', requiresBusiness: true, icon: 'dispensary' },
    budtender: { label: 'Budtender', description: 'Front-line staff', requiresBusiness: true, icon: 'dispensary' },
    customer: { label: 'Customer', description: 'End consumer', requiresBusiness: false, icon: 'user' },
};

const DEFAULT_ROLE_OPTIONS: UserRole[] = [
    'brand_admin',
    'brand_member',
    'dispensary_admin',
    'dispensary_staff',
    'budtender',
    'customer',
    'super_user',
];

const formSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    role: z.enum(ROLES),
    businessName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    sendEmail: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface InviteUserDialogProps {
    trigger?: React.ReactNode;
    onSuccess?: () => void;
    defaultRole?: typeof ROLES[number];
    orgId?: string;
    allowedRoles?: UserRole[];
}

function renderRoleIcon(role: string) {
    const icon = ROLE_CONFIG[role]?.icon;

    if (icon === 'brand') {
        return <Building2 className="h-4 w-4" />;
    }

    if (icon === 'dispensary') {
        return <Store className="h-4 w-4" />;
    }

    return <UserPlus className="h-4 w-4" />;
}

function toAbsoluteLink(link: string): string {
    if (typeof window === 'undefined') return link;
    return new URL(link, window.location.origin).toString();
}

export function InviteUserDialog({
    trigger,
    onSuccess,
    defaultRole = 'brand_admin',
    orgId,
    allowedRoles,
}: InviteUserDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    const roleOptions = allowedRoles?.length
        ? allowedRoles
        : orgId
            ? getInviteAllowedRoles(defaultRole)
            : DEFAULT_ROLE_OPTIONS;
    const initialRole = roleOptions.includes(defaultRole) ? defaultRole : (roleOptions[0] ?? defaultRole);
    const isContextualInvite = Boolean(orgId);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            role: initialRole,
            businessName: '',
            firstName: '',
            lastName: '',
            sendEmail: true,
        },
    });

    const selectedRole = form.watch('role');
    const requiresBusiness = !isContextualInvite && (ROLE_CONFIG[selectedRole]?.requiresBusiness ?? false);

    async function onSubmit(values: FormValues) {
        if (roleOptions.length > 0 && !roleOptions.includes(values.role)) {
            form.setError('role', { message: 'This role is not available in the current invite context.' });
            return;
        }

        if (requiresBusiness && !values.businessName) {
            form.setError('businessName', { message: 'Business name is required for this role' });
            return;
        }

        setIsSubmitting(true);
        setInviteLink(null);

        try {
            if (isContextualInvite && orgId) {
                const result = await createInvitationAction({
                    email: values.email,
                    role: values.role,
                    targetOrgId: orgId,
                    sendEmail: values.sendEmail,
                });

                if (!result.success || !result.link) {
                    throw new Error(result.message || 'Failed to create invitation.');
                }

                setInviteLink(toAbsoluteLink(result.link));
            } else {
                const result = await inviteUser(values);

                if (!result.success || !result.link) {
                    throw new Error(result.error || 'Failed to invite user.');
                }

                setInviteLink(toAbsoluteLink(result.link));
            }

            toast({
                title: 'Invitation Ready',
                description: values.sendEmail
                    ? 'The invitation was sent immediately. You can also share the link below.'
                    : 'Invitation created. Share the link below.',
            });
            onSuccess?.();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to invite user.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const copyToClipboard = () => {
        if (!inviteLink) return;

        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ description: 'Link copied to clipboard' });
    };

    const reset = () => {
        setInviteLink(null);
        form.reset({
            email: '',
            role: initialRole,
            businessName: '',
            firstName: '',
            lastName: '',
            sendEmail: true,
        });
        setIsOpen(false);
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    reset();
                    return;
                }

                setIsOpen(true);
            }}
        >
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite User
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                        {isContextualInvite
                            ? 'Invite a team member to this workspace.'
                            : 'Create an account and send an invitation email.'}
                    </DialogDescription>
                </DialogHeader>

                {!inviteLink ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="user@company.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roleOptions.map((role) => (
                                                    <SelectItem key={role} value={role}>
                                                        <div className="flex items-center gap-2">
                                                            {renderRoleIcon(role)}
                                                            {ROLE_CONFIG[role]?.label || role}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>{ROLE_CONFIG[selectedRole]?.description}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {requiresBusiness && (
                                <FormField
                                    control={form.control}
                                    name="businessName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{isBrandRole(selectedRole) ? 'Brand Name' : 'Dispensary Name'}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={isBrandRole(selectedRole) ? 'Acme Cannabis Co.' : 'Green Leaf Dispensary'}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {!isContextualInvite && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Last Name (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="sendEmail"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="flex items-center gap-2 text-base">
                                                <Mail className="h-4 w-4" />
                                                Send Immediately
                                            </FormLabel>
                                            <FormDescription>
                                                Email this invitation as soon as it is created.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {form.watch('sendEmail') ? 'Send Invite' : 'Create Link'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
                            <Check className="mx-auto mb-2 h-8 w-8 text-green-500" />
                            <h3 className="font-semibold text-foreground">Invitation Ready</h3>
                            <p className="text-sm text-muted-foreground">
                                {form.getValues('sendEmail')
                                    ? 'The invitation was emailed. You can also share the link below.'
                                    : 'Share the link below with the user.'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Invitation Link</label>
                            <div className="flex gap-2">
                                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This link stays valid for 7 days.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={reset}>
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    setInviteLink(null);
                                    form.reset({
                                        email: '',
                                        role: initialRole,
                                        businessName: '',
                                        firstName: '',
                                        lastName: '',
                                        sendEmail: true,
                                    });
                                }}
                            >
                                Invite Another
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
