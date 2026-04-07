'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Clock, UserPlus, LogOut, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BudtenderShift } from '@/server/actions/budtender-shift';

interface BudtenderClockInCardProps {
    orgId: string;
}

export function BudtenderClockInCard({ orgId }: BudtenderClockInCardProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [clockingIn, setClockingIn] = useState(false);
    const [clockingOut, setClockingOut] = useState(false);
    const [activeBudtenders, setActiveBudtenders] = useState<BudtenderShift[]>([]);
    const [firstName, setFirstName] = useState('');
    const [userId, setUserId] = useState('');

    const loadActiveBudtenders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/budtender-shift?orgId=${orgId}&action=active`);
            const data = await res.json();
            if (data.success && data.budtenders) {
                setActiveBudtenders(data.budtenders);
            }
        } catch (err) {
            console.error('Failed to load budtenders:', err);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        loadActiveBudtenders();
        const interval = setInterval(loadActiveBudtenders, 30000);
        return () => clearInterval(interval);
    }, [loadActiveBudtenders]);

    const handleClockIn = async () => {
        if (!firstName.trim()) {
            toast({ title: 'Enter your name', variant: 'destructive' });
            return;
        }
        setClockingIn(true);
        try {
            const res = await fetch('/api/budtender-shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId, firstName: firstName.trim(), userId: userId || 'unknown' }),
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Clocked in!', description: `${firstName} is now on duty` });
                setFirstName('');
                loadActiveBudtenders();
            } else {
                toast({ title: 'Failed', description: data.error, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to clock in', variant: 'destructive' });
        } finally {
            setClockingIn(false);
        }
    };

    const handleClockOut = async (shiftId: string) => {
        setClockingOut(true);
        try {
            const res = await fetch('/api/budtender-shift', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId, shiftId }),
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Clocked out', description: 'Thanks for your shift!' });
                loadActiveBudtenders();
            } else {
                toast({ title: 'Failed', description: data.error, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to clock out', variant: 'destructive' });
        } finally {
            setClockingOut(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base">Budtenders On Duty</CardTitle>
                    {activeBudtenders.length > 0 && (
                        <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                            {activeBudtenders.length} active
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    Clock in when you start your shift
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {/* Clock in form */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Your name"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleClockIn()}
                                className="flex-1"
                            />
                            <Button 
                                onClick={handleClockIn} 
                                disabled={clockingIn || !firstName.trim()}
                                className="gap-1.5"
                            >
                                {clockingIn ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <UserPlus className="h-4 w-4" />
                                )}
                                Clock In
                            </Button>
                        </div>

                        {/* Active budtenders list */}
                        {activeBudtenders.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Currently on duty
                                </p>
                                <div className="divide-y rounded-lg border">
                                    {activeBudtenders.map(budtender => (
                                        <div
                                            key={budtender.id}
                                            className="flex items-center justify-between p-3"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                <span className="font-medium">{budtender.firstName}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {budtender.role}
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleClockOut(budtender.id)}
                                                disabled={clockingOut}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <LogOut className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No budtenders clocked in</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
