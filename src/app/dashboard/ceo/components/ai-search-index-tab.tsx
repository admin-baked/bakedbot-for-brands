
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { initializeAllEmbeddings, type EmbeddingActionResult } from '../actions';
import { BrainCircuit, Check, Loader2, ServerCrash, X } from 'lucide-react';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const initialState: EmbeddingActionResult = {
  message: '',
  results: [],
};

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 animate-spin" /> : <BrainCircuit className="mr-2" />}
      {pending ? 'Generating...' : 'Generate All Embeddings'}
    </Button>
  );
}

export default function AISearchIndexTab() {
  const [state, formAction] = useFormState(initializeAllEmbeddings, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.message && state.message.startsWith('Successfully')) {
      toast({
        title: 'Success!',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form action={formAction}>
          <CardHeader>
            <CardTitle>Generate Embeddings</CardTitle>
            <CardDescription>
              Clicking this button will process all products in the database. For each product, it will summarize its reviews and generate a vector embedding. This process enables semantic AI search for product recommendations. It is safe to re-run this process at any time.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <GenerateButton />
          </CardFooter>
        </form>
      </Card>
      
      {state.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              Log of the embedding generation process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 w-full rounded-md border p-4 font-mono text-sm">
              {state.results.map((result: { productId: string; status: string }) => (
                 <div key={result.productId} className="flex items-center gap-2 mb-1">
                  {result.status.startsWith('Embedding updated') ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive" />}
                  <span>{result.productId}:</span>
                  <span className="text-muted-foreground">{result.status}</span>
                 </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {state.message && state.message.startsWith('Initialization failed') && (
         <Card className="border-destructive">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><ServerCrash /> Unhandled Error</CardTitle>
                 <CardDescription className="text-destructive">
                    The process failed unexpectedly. See the error message below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="font-mono text-sm">{state.message}</p>
            </CardContent>
         </Card>
      )}

    </div>
  );
}
