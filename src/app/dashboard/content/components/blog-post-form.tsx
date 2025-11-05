'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createBlogPost } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import BlogPostDisplay from './blog-post-display';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const initialState = {
  message: '',
  data: null,
  error: false,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Generate Post
    </Button>
  );
}

export default function BlogPostForm() {
  const [state, formAction] = useFormState(createBlogPost, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [generatedPost, setGeneratedPost] = useState(initialState.data);

  useEffect(() => {
    if (state.message) {
      if (state.error && !state.fieldErrors) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: state.message,
        });
      }
    }
    if (!state.error && state.data) {
      setGeneratedPost(state.data);
      formRef.current?.reset();
    }
  }, [state, toast]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form action={formAction} ref={formRef}>
        <Card>
          <CardHeader>
            <CardTitle>Blog Post Details</CardTitle>
            <CardDescription>Fill in the details below to generate a new blog post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" name="topic" placeholder="e.g., Benefits of CBD for anxiety" />
              {state.fieldErrors?.topic && <p className="text-sm text-destructive">{state.fieldErrors.topic[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="productType">Related Product Type</Label>
               <Input id="productType" name="productType" placeholder="e.g., Edibles, Tinctures" />
               {state.fieldErrors?.productType && <p className="text-sm text-destructive">{state.fieldErrors.productType[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input id="keywords" name="keywords" placeholder="e.g., CBD, anxiety, wellness, natural" />
              {state.fieldErrors?.keywords && <p className="text-sm text-destructive">{state.fieldErrors.keywords[0]}</p>}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select name="tone">
                    <SelectTrigger id="tone">
                    <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Informative">Informative</SelectItem>
                    <SelectItem value="Humorous">Humorous</SelectItem>
                    <SelectItem value="Persuasive">Persuasive</SelectItem>
                    <SelectItem value="Friendly">Friendly</SelectItem>
                    </SelectContent>
                </Select>
                {state.fieldErrors?.tone && <p className="text-sm text-destructive">{state.fieldErrors.tone[0]}</p>}
                </div>
                <div className="space-y-2">
                <Label htmlFor="length">Length</Label>
                <Select name="length">
                    <SelectTrigger id="length">
                    <SelectValue placeholder="Select a length" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Short">Short (~300 words)</SelectItem>
                    <SelectItem value="Medium">Medium (~700 words)</SelectItem>
                    <SelectItem value="Long">Long (~1200 words)</SelectItem>
                    </SelectContent>
                </Select>
                {state.fieldErrors?.length && <p className="text-sm text-destructive">{state.fieldErrors.length[0]}</p>}
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </Card>
      </form>
      <BlogPostDisplay blogPost={generatedPost} />
    </div>
  );
}
