'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import { saveEmailSettings } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useStore } from '@/hooks/use-store';

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
      Save Email Settings
    </Button>
  );
}

export default function EmailSettings() {
    const [state, formAction] = useActionState(saveEmailSettings, initialState);
    const { toast } = useToast();
    const { emailProvider, setEmailProvider, sendgridApiKey, setSendgridApiKey } = useStore();
    const [apiKey, setApiKey] = useState(sendgridApiKey || '');

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.error ? 'Error' : 'Success',
                description: state.message,
                variant: state.error ? 'destructive' : 'default',
            });
            if (!state.error) {
              setSendgridApiKey(apiKey);
            }
        }
    }, [state, toast, setSendgridApiKey, apiKey]);

    return (
        <Card>
            <form action={formAction}>
                <CardHeader>
                    <CardTitle>Transactional Email</CardTitle>
                    <CardDescription>
                        Configure a service to send transactional emails for order confirmations. This is a CEO-level setting.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Email Provider</Label>
                        <RadioGroup 
                            name="emailProvider"
                            value={emailProvider} 
                            onValueChange={(value: 'sendgrid' | 'gmail') => setEmailProvider(value)}
                            className="flex gap-4"
                        >
                            <Label htmlFor="sendgrid" className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:border-primary">
                                <RadioGroupItem value="sendgrid" id="sendgrid" />
                                SendGrid
                            </Label>
                            <Label htmlFor="gmail" className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:border-primary">
                                <RadioGroupItem value="gmail" id="gmail" />
                                Gmail
                            </Label>
                        </RadioGroup>
                    </div>

                    {emailProvider === 'sendgrid' && (
                        <div className="space-y-2">
                            <Label htmlFor="sendgrid-api-key">SendGrid API Key</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  id="sendgrid-api-key"
                                  name="apiKey"
                                  type="password"
                                  placeholder="SG.••••••••••••••••••••••"
                                  value={apiKey}
                                  onChange={(e) => setApiKey(e.target.value)}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">Your SendGrid API key with mail sending permissions.</p>
                            {state.fieldErrors?.apiKey && <p className="text-sm text-destructive">{state.fieldErrors.apiKey[0]}</p>}
                        </div>
                    )}

                     {emailProvider === 'gmail' && (
                        <div className="space-y-2 text-sm text-muted-foreground border p-4 rounded-md">
                            <p>Gmail integration is coming soon. For now, please configure SendGrid for transactional emails.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}
