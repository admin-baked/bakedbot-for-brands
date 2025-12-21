'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';

export function ProfileView() {
    const { user, firestore } = useFirebase();
    const { userData } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState(userData?.firstName || '');
    const [lastName, setLastName] = useState(userData?.lastName || '');
    const [phone, setPhone] = useState(userData?.phone || '');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) return;

        setIsSaving(true);
        try {
            await updateDoc(doc(firestore, 'users', user.uid), {
                firstName,
                lastName,
                phone,
                updatedAt: new Date()
            });

            toast({
                title: "Profile updated",
                description: "Your changes have been saved successfully."
            });
        } catch (error) {
            console.error('Error saving profile:', error);
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                    Update your personal details and contact information.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Jane"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-[10px] text-muted-foreground">Email address cannot be changed directly.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t px-6 py-4">
                    <div className="text-xs text-muted-foreground">
                        User ID: <span className="font-mono">{user?.uid}</span>
                    </div>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
