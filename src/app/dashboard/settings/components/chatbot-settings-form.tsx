
'use client';

import { useFormState } from 'react-dom';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateChatbotSettings, type BrandSettingsFormState } from '../actions';
import type { Brand } from '@/types/domain';
import { SubmitButton } from './submit-button';

const initialState: BrandSettingsFormState = {
  message: '',
  error: false,
};

interface ChatbotSettingsFormProps {
    brand: Brand;
}

export default function ChatbotSettingsForm({ brand }: ChatbotSettingsFormProps) {
  const [state, formAction] = useFormState(updateChatbotSettings, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
     if (state.message) {
      if (state.error && !state.fieldErrors) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
      } else if (!state.error) {
         toast({ title: 'Success!', description: state.message });
      }
    }
  }, [state, toast]);

  return (
    <Card>
      <form ref={formRef} action={formAction}>
        <CardHeader>
          <CardTitle>AI Budtender</CardTitle>
          <CardDescription>Customize your chatbot's personality and initial greeting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="basePrompt">Base Personality Prompt</Label>
            <Textarea
              id="basePrompt"
              name="basePrompt"
              defaultValue={brand.chatbotConfig?.basePrompt}
              rows={4}
            />
             {state.fieldErrors?.basePrompt && <p className="text-sm text-destructive">{state.fieldErrors.basePrompt[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              name="welcomeMessage"
              defaultValue={brand.chatbotConfig?.welcomeMessage}
              rows={2}
            />
            {state.fieldErrors?.welcomeMessage && <p className="text-sm text-destructive">{state.fieldErrors.welcomeMessage[0]}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
