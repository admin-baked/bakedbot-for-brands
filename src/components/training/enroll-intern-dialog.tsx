/**
 * Enroll Intern Dialog
 *
 * UI component for enrolling users in the training program.
 * Sets role to 'intern' and optionally assigns to a cohort.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { enrollIntern, setUserRole } from '@/server/actions/admin/set-user-role';
import { Spinner } from '@/components/ui/spinner';
import { UserPlus } from 'lucide-react';

interface EnrollInternDialogProps {
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function EnrollInternDialog({ trigger, onSuccess }: EnrollInternDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uid, setUid] = useState('');
    const [cohortId, setCohortId] = useState('');
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!uid.trim()) {
            toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'Please enter a user UID'
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await enrollIntern({
                uid: uid.trim(),
                cohortId: cohortId.trim() || undefined,
            });

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.data.message
                });
                setOpen(false);
                setUid('');
                setCohortId('');
                onSuccess?.();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Failed to Enroll',
                    description: result.error
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unexpected error occurred'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="default" size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Enroll Intern
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enroll Intern</DialogTitle>
                    <DialogDescription>
                        Set a user's role to 'intern' to grant access to the training program.
                        The user must sign out and back in for changes to take effect.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="uid">User UID *</Label>
                            <Input
                                id="uid"
                                placeholder="Enter Firebase UID"
                                value={uid}
                                onChange={(e) => setUid(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Find the UID in Firebase Console → Authentication
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cohortId">Cohort ID (Optional)</Label>
                            <Input
                                id="cohortId"
                                placeholder="e.g., cohort-2026-q1"
                                value={cohortId}
                                onChange={(e) => setCohortId(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                            Enroll as Intern
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Set Role Dialog - More general version for any role
 */
interface SetRoleDialogProps {
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function SetRoleDialog({ trigger, onSuccess }: SetRoleDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uid, setUid] = useState('');
    const [role, setRole] = useState<'super_user' | 'owner' | 'brand' | 'dispensary' | 'customer' | 'intern'>('intern');
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!uid.trim()) {
            toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'Please enter a user UID'
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await setUserRole({
                uid: uid.trim(),
                role,
            });

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.data.message
                });
                setOpen(false);
                setUid('');
                onSuccess?.();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Failed to Set Role',
                    description: result.error
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unexpected error occurred'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        Set User Role
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set User Role</DialogTitle>
                    <DialogDescription>
                        Assign a role to a user. They must sign out and back in for changes to take effect.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="uid">User UID *</Label>
                            <Input
                                id="uid"
                                placeholder="Enter Firebase UID"
                                value={uid}
                                onChange={(e) => setUid(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <select
                                id="role"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                            >
                                <option value="intern">Intern (Training Access)</option>
                                <option value="super_user">Super User (Full Access)</option>
                                <option value="owner">Owner</option>
                                <option value="brand">Brand</option>
                                <option value="dispensary">Dispensary</option>
                                <option value="customer">Customer</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                            Set Role
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
