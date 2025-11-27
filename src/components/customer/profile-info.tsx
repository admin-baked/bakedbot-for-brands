/**
 * Profile Info Component
 * Displays and allows editing of customer profile information
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, Calendar, Edit, CheckCircle, XCircle } from 'lucide-react';
import { ProfileEditModal } from './profile-edit-modal';

export function ProfileInfo() {
    const { user, loading } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null;
    }

    const initials = user.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U';

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Profile Information</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar and Name */}
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-2xl font-semibold">{user.displayName || 'Customer'}</h3>
                            <p className="text-sm text-muted-foreground">Customer Account</p>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start space-x-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Email</p>
                            <div className="flex items-center space-x-2">
                                <p className="font-medium">{user.email}</p>
                                {user.emailVerified ? (
                                    <Badge variant="default" className="text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive" className="text-xs">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Not Verified
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start space-x-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">Not provided</p>
                        </div>
                    </div>

                    {/* Member Since */}
                    <div className="flex items-start space-x-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Member Since</p>
                            <p className="font-medium">
                                {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ProfileEditModal open={isEditOpen} onOpenChange={setIsEditOpen} />
        </>
    );
}
