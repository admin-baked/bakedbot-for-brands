'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Star, Upload, Send, Loader2, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { submitReview, type ReviewFormState } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMenuData } from '@/hooks/use-menu-data';
import { Footer } from '../components/footer';
import Header from '../components/header';

const initialState: ReviewFormState = {
  message: '',
  error: false,
  fieldErrors: {},
};

const StarRating = ({ rating, setRating, disabled }: { rating: number; setRating: (rating: number) => void, disabled?: boolean }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-8 w-8 transition-colors ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          } ${!disabled ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={() => !disabled && setRating(star)}
        />
      ))}
    </div>
  );
};

export default function LeaveReviewClient() {
  const { user, isUserLoading } = useUser();
  const { products, isLoading: areProductsLoading } = useMenuData();
  const [rating, setRating] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [state, formAction] = useFormState(submitReview, initialState);
  const { pending } = useFormStatus();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state.message) {
      if (!state.error) {
        setShowSuccess(true);
        formRef.current?.reset();
        setRating(0);
        setFileName(null);
      } else {
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: state.message,
        });
      }
    }
  }, [state, toast]);
  
  useEffect(() => {
    // This effect runs the client-side logic to get the ID token
    // and append it to the form. This is a secure way to pass user identity
    // to a Server Action.
    const attachIdTokenToForm = async () => {
      if (user && formRef.current) {
        try {
          const token = await user.getIdToken();
          
          let tokenInput = formRef.current.querySelector('input[name="idToken"]') as HTMLInputElement;
          if (!tokenInput) {
            tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'idToken';
            formRef.current.appendChild(tokenInput);
          }
          tokenInput.value = token;

        } catch (error) {
          console.error("Error getting ID token for form:", error);
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not verify your session. Please try logging in again.',
          });
        }
      }
    };
    
    attachIdTokenToForm();
  }, [user, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };
  
  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (showSuccess) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <PartyPopper className="mx-auto h-16 w-16 text-primary" />
                    <CardTitle className="text-3xl font-bold mt-4">Thank You!</CardTitle>
                    <CardDescription>Your review has been submitted successfully. We appreciate your feedback!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={() => setShowSuccess(false)}>Leave Another Review</Button>
                    <div>
                        <Button variant="link" asChild>
                            <Link href="/">
                                &larr; Back to Menu
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Header />
      <main className="flex-1">
        <div className="flex flex-col items-center justify-center p-4 pt-16">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Leave a Review</CardTitle>
              <CardDescription>
                Share your experience to help others in the community. Please upload a photo of your receipt or the product's Certificate of Analysis (COA) to verify your review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTitle>You are not signed in!</AlertTitle>
                    <AlertDescription>
                        You must be signed in to leave a review. <Link href="/brand-login" className="font-bold underline">Click here to sign in or sign up.</Link>
                    </AlertDescription>
                </Alert>
              )}
              <form
                ref={formRef}
                action={(formData) => {
                  formData.append('rating', String(rating));
                  formAction(formData);
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="productId">Which product are you reviewing?</Label>
                  <Select name="productId" disabled={!user || areProductsLoading || pending}>
                    <SelectTrigger id="productId">
                      <SelectValue placeholder={areProductsLoading ? "Loading products..." : "Select a product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {state.fieldErrors?.productId && <p className="text-sm text-destructive">{state.fieldErrors.productId[0]}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Your Rating</Label>
                  <StarRating rating={rating} setRating={setRating} disabled={!user || pending} />
                  {state.fieldErrors?.rating && <p className="text-sm text-destructive">{state.fieldErrors.rating[0]}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text">Your Review</Label>
                  <Textarea
                    id="text"
                    name="text"
                    placeholder="What did you like or dislike? How was your experience?"
                    rows={6}
                    disabled={!user || pending}
                  />
                  {state.fieldErrors?.text && <p className="text-sm text-destructive">{state.fieldErrors.text[0]}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Verification (Receipt or COA)</Label>
                    <div className="flex items-center justify-center w-full">
                        <Label htmlFor="verificationImage" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg ${user ? 'cursor-pointer bg-muted/50 hover:bg-muted' : 'cursor-not-allowed bg-gray-100'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                {fileName ? (
                                    <p className="font-semibold text-sm text-primary">{fileName}</p>
                                ) : (
                                    <>
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, or PDF (up to 5MB)</p>
                                    </>
                                )}
                            </div>
                            <Input id="verificationImage" name="verificationImage" type="file" className="hidden" accept="image/png, image/jpeg, application/pdf" onChange={handleFileChange} disabled={!user || pending} />
                        </Label>
                    </div>
                </div>
                <Button type="submit" className="w-full" disabled={pending || !user}>
                    {pending ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                    Submit Review
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
