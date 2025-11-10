
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";
import { saveBakedBotApiKey } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/firebase/auth/use-user';

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
      Save Settings
    </Button>
  );
}

export default function BakedBotSettings() {
    const { user } = useUser();
    const [state, formAction] = useFormState(saveBakedBotApiKey, initialState);
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
                <input type="hidden" name="userId" value={user?.uid || ''} />
                <CardHeader>
                    <CardTitle>API Credentials</CardTitle>
                    <CardDescription>
                        Your API key connects your app to the BakedBot service. Keep this secure and never share it publicly.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <KeyRound className="h-4 w-4" />
                        <AlertDescription>
                            API key configured successfully.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label htmlFor="bakedbot-api-key">API Key</Label>
                        <div className="relative">
                            <Input id="bakedbot-api-key" name="bakedbot-api-key" type="password" placeholder="pk_••••••••••••••••••••••••••••••" />
                        </div>
                        <p className="text-sm text-muted-foreground">Your BakedBot API key from your dashboard.</p>
                        {state?.fieldErrors?.apiKey && <p className="text-sm text-destructive">{state.fieldErrors.apiKey[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bakedbot-api-url">BakedBot API URL</Label>
                        <div className="relative">
                            <Input id="bakedbot-api-url" name="bakedbot-api-url" type="text" defaultValue="https://api.bakedbot.ai/v1" disabled />
                        </div>
                        <p className="text-sm text-muted-foreground">The URL for the BakedBot API (usually no need to change).</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}
