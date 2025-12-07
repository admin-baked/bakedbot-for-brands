import { useRef, useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { initializeAllEmbeddings, type EmbeddingActionResult } from '../actions';
import { BrainCircuit, Check, Loader2, ServerCrash, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const initialState: EmbeddingActionResult = {
  message: '',
  results: [],
};

function GenerateButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="w-full sm:w-auto"
    >
      {pending ? <Loader2 className="mr-2 animate-spin" /> : <BrainCircuit className="mr-2" />}
      {pending ? 'Generating...' : 'Generate All Embeddings'}
    </Button>
  );
}

export default function AISearchIndexTab() {
  const [state, formAction] = useFormState(initializeAllEmbeddings, initialState);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message && state.message.startsWith('Successfully')) {
      toast({
        title: 'Success!',
        description: state.message,
      });
      setOpen(false); // Close dialog if it was somehow open (though submit usually closes it or we handle it)
    }
  }, [state, toast]);

  const handleConfirm = () => {
    formRef.current?.requestSubmit();
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form ref={formRef} action={formAction}>
          <CardHeader>
            <CardTitle>Generate Embeddings</CardTitle>
            <CardDescription>
              Clicking this button will process all products in the database. For each product, it will summarize its reviews and generate a vector embedding. This process enables semantic AI search for product recommendations. It is safe to re-run this process at any time.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                {/* Trigger provided via GenerateButton logic */}
                <GenerateButton onClick={() => setOpen(true)} />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will regenerate embeddings for ALL products. This operation can take a significant amount of time and system resources.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirm(); }}>
                    Yes, Generate Embeddings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </form>
      </Card>

      {/* Results Log */}
      {state.results && state.results.length > 0 && (
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

      {/* Error State */}
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
