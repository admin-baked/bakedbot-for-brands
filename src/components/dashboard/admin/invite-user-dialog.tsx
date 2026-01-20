'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { inviteUser } from '@/app/actions/admin/users';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Copy, Check, UserPlus, Mail, Building2, Store } from 'lucide-react';
import { ROLES, isBrandRole, isDispensaryRole } from '@/types/roles';

// Role display configuration
const ROLE_CONFIG: Record<string, { label: string; description: string; requiresBusiness: boolean }> = {
    super_user: { label: 'Super Admin', description: 'Full platform access', requiresBusiness: false },
    brand_admin: { label: 'Brand Admin', description: 'Brand owner with full access', requiresBusiness: true },
    brand_member: { label: 'Brand Member', description: 'Brand team member', requiresBusiness: true },
    brand: { label: 'Brand (Legacy)', description: 'Legacy brand role', requiresBusiness: true },
    dispensary_admin: { label: 'Dispensary Admin', description: 'Dispensary owner', requiresBusiness: true },
    dispensary_staff: { label: 'Dispensary Staff', description: 'Dispensary employee', requiresBusiness: true },
    dispensary: { label: 'Dispensary (Legacy)', description: 'Legacy dispensary role', requiresBusiness: true },
    budtender: { label: 'Budtender', description: 'Front-line staff', requiresBusiness: true },
    customer: { label: 'Customer', description: 'End consumer', requiresBusiness: false },
};

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
}

export function InviteUserDialog({ trigger, onSuccess, defaultRole = 'brand' }: InviteUserDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            role: defaultRole,
            businessName: '',
            firstName: '',
            lastName: '',
            sendEmail: true,
        },
    });

    const selectedRole = form.watch('role');
    const requiresBusiness = ROLE_CONFIG[selectedRole]?.requiresBusiness ?? false;

    async function onSubmit(values: FormValues) {
        // Validate business name for roles that require it
        if (requiresBusiness && !values.businessName) {
            form.setError('businessName', { message: 'Business name is required for this role' });
            return;
        }

        setIsSubmitting(true);
        setInviteLink(null);
        try {
            const result = await inviteUser(values);
            if (result.success && result.link) {
                setInviteLink(result.link);
                toast({
                    title: 'Invitation Sent!',
                    description: values.sendEmail
                        ? 'Email sent via Mailjet. You can also share the link below.'
                        : 'Link generated. Share it with the user.',
                });
                onSuccess?.();
            } else {
                throw new Error(result.error);
            }
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
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ description: 'Link copied to clipboard' });
        }
    };

    const reset = () => {
        setInviteLink(null);
        form.reset();
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) reset();
            else setIsOpen(true);
        }}>
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
                        Create an account and send an invitation email via Mailjet.
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="brand_admin">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4" />
                                                        Brand Admin
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="brand_member">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4" />
                                                        Brand Team Member
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="dispensary_admin">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="h-4 w-4" />
                                                        Dispensary Admin
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="dispensary_staff">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="h-4 w-4" />
                                                        Dispensary Staff
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="budtender">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="h-4 w-4" />
                                                        Budtender
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="customer">
                                                    <div className="flex items-center gap-2">
                                                        <UserPlus className="h-4 w-4" />
                                                        Customer
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="super_user">
                                                    <div className="flex items-center gap-2">
                                                        <UserPlus className="h-4 w-4 text-red-500" />
                                                        Super Admin
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {ROLE_CONFIG[selectedRole]?.description}
                                        </FormDescription>
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
                                            <FormLabel>
                                                {isBrandRole(selectedRole) ? 'Brand Name' : 'Dispensary Name'}
                                            </FormLabel>
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

                            <FormField
                                control={form.control}
                                name="sendEmail"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Send Email Invitation
                                            </FormLabel>
                                            <FormDescription>
                                                Send invitation via Mailjet immediately
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
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
                                    {form.watch('sendEmail') ? 'Send Invite' : 'Create User'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                            <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <h3 className="font-semibold text-foreground">Invitation Sent!</h3>
                            <p className="text-sm text-muted-foreground">
                                {form.getValues('sendEmail')
                                    ? 'The user has been emailed via Mailjet.'
                                    : 'User created. Share the link below.'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Onboarding Link</label>
                            <div className="flex gap-2">
                                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Share this link manually or use it to complete setup yourself.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={reset}>Close</Button>
                            <Button onClick={() => { setInviteLink(null); form.reset(); }}>
                                Invite Another
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
