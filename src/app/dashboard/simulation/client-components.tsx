'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { runSimulation } from './actions';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';

export function RunButton({ scenarioId }: { scenarioId: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    const handleRun = () => {
        startTransition(async () => {
            try {
                const result = await runSimulation({ scenarioId });
                toast({ title: 'Simulation Started', description: 'Your run has been queued.' });
                router.push(`/dashboard/simulation/${result.runId}`);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to start simulation.' });
            }
        });
    };

    return (
        <Button size="sm" onClick={handleRun} disabled={isPending}>
            {isPending ? (
                <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Running...
                </>
            ) : (
                <>
                    <Play className="h-3 w-3 mr-2" />
                    Run Sim
                </>
            )}
        </Button>
    );
}
