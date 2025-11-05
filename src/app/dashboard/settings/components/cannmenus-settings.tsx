
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";
import { saveCannMenusApiKey } from '../actions';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const initialState = {
  message: '',
  error: false,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save API Key
    </Button>
  );
}

export default function CannMenusSettings() {
    const [state, formAction] = useFormState(saveCannMenusApiKey, initialState);
    const { toast } = useToast();

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.error ? 'Error' : 'Success',
                description: state.message,
                variant: state.error ? 'destructive' : 'default',
            });
        }
    }, [state, toast]);

    return (
        <Card>
            <form action={formAction}>
                <CardHeader>
                    <CardTitle>CannMenus Integration</CardTitle>
                    <CardDescription>
                        Enter your CannMenus API key to automatically sync your products.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="cannmenus-api-key">API Key</Label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="cannmenus-api-key" name="cannmenus-api-key" type="password" placeholder="••••••••••••••••••••••••••••••••" className="pl-8" />
                        </div>
                        {state?.fieldErrors?.apiKey && <p className="text-sm text-destructive">{state.fieldErrors.apiKey[0]}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}

    