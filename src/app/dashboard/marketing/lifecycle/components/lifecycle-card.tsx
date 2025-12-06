'use client';

import { useState } from 'react';
import { LifecycleFlow, toggleFlow, simulateTrigger } from '../actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Play, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LifecycleFlowCard({ flow }: { flow: LifecycleFlow }) {
    const [status, setStatus] = useState(flow.status);
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const { toast } = useToast();

    const handleToggle = async () => {
        setIsLoading(true);
        try {
            const updated = await toggleFlow(flow.id, status);
            setStatus(updated.status);
            toast({
                title: `Flow ${updated.status === 'active' ? 'Enabled' : 'Disabled'}`,
                description: `${flow.name} is now ${updated.status}.`
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update flow status.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        try {
            await simulateTrigger(flow.id);
            toast({
                title: 'Simulation Successful',
                description: `Triggered ${flow.name} test event.`,
                className: 'bg-green-50 border-green-200'
            });
        } catch (error) {
            toast({
                title: 'Simulation Failed',
                description: 'Could not trigger test event.',
                variant: 'destructive'
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card className={`transition-all ${status === 'active' ? 'border-primary/50 shadow-sm' : 'opacity-80'}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant={status === 'active' ? 'default' : 'secondary'} className="mb-2">
                            {status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                        <CardTitle className="text-lg">{flow.name}</CardTitle>
                    </div>
                    <Switch
                        checked={status === 'active'}
                        onCheckedChange={handleToggle}
                        disabled={isLoading}
                    />
                </div>
                <CardDescription>{flow.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
                <div className="flex justify-between items-center text-sm mb-4">
                    <span className="font-medium text-muted-foreground">Trigger:</span>
                    <Badge variant="outline">{flow.trigger}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs border-t pt-3">
                    <div>
                        <div className="font-bold text-lg">{flow.stats.sent.toLocaleString()}</div>
                        <div className="text-muted-foreground">Sent</div>
                    </div>
                    <div>
                        <div className="font-bold text-lg">{(flow.stats.openRate * 100).toFixed(0)}%</div>
                        <div className="text-muted-foreground">Open Rate</div>
                    </div>
                    <div>
                        <div className="font-bold text-lg">{(flow.stats.conversionRate * 100).toFixed(0)}%</div>
                        <div className="text-muted-foreground">Conv. Rate</div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/20 pt-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-primary"
                    onClick={handleTest}
                    disabled={isTesting}
                >
                    {isTesting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Play className="mr-2 h-4 w-4" />
                    )}
                    {isTesting ? 'Simulating...' : 'Test Trigger'}
                </Button>
            </CardFooter>
        </Card>
    );
}
