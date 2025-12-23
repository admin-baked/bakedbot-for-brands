'use client';

/**
 * Confirmation dialog for destructive deletion operations
 * Requires typing "DELETE" to confirm
 */

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
    itemName?: string;
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    itemName,
}: DeleteConfirmationDialogProps) {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const canDelete = confirmText === 'DELETE';

    const handleConfirm = async () => {
        if (!canDelete) return;

        setIsDeleting(true);
        try {
            await onConfirm();
            onOpenChange(false);
            setConfirmText('');
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancel = () => {
        setConfirmText('');
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">{title}</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>{description}</p>
                        {itemName && (
                            <p className="font-semibold">
                                Deleting: <span className="text-foreground">{itemName}</span>
                            </p>
                        )}
                        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-sm font-semibold text-destructive mb-2">⚠️ This action cannot be undone</p>
                            <p className="text-xs text-muted-foreground">
                                All associated data will be permanently deleted from the database and Firebase Auth.
                            </p>
                        </div>
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="confirm-delete">
                                Type <span className="font-mono font-bold">DELETE</span> to confirm
                            </Label>
                            <Input
                                id="confirm-delete"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type DELETE"
                                className="font-mono"
                                disabled={isDeleting}
                            />
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={!canDelete || isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Permanently'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
