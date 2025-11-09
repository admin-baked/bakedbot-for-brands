
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Suspense, useState, useEffect, useRef } from 'react';
import { Upload, CalendarIcon, Loader2 } from 'lucide-react';
import { submitOrder } from './actions';
import { useUser } from '@/firebase';
import { useCart } from '@/hooks/use-cart';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Location } from '@/lib/types';

const initialState = {
  message: '',
  error: false,
  fieldErrors: {},
  orderId: null,
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="mr-2 animate-spin" /> : null}
            {pending ? 'Submitting...' : 'Submit Order'}
        </Button>
    )
}

export function CheckoutForm({ onOrderSuccess, selectedLocation }: { onOrderSuccess: (orderId: string) => void; selectedLocation: Location }) {
  const { user } = useUser();
  const { items } = useCart();
  const [state, formAction] = useFormState(submitOrder, initialState);
  
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [idImageName, setIdImageName] = useState<string | null>(null);

  // This effect will run when the server action completes
  useEffect(() => {
    if (state.message && state.error) {
        // Handle and display errors from the server action
        console.error("Server Action Error:", state.message);
    } else if (state.message && !state.error && state.orderId) {
        // On success, call the parent handler
        onOrderSuccess(state.orderId);
    }
  }, [state, onOrderSuccess]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setIdImageName(file ? file.name : null);
  };
  
  return (
     <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    {/* Hidden inputs to pass necessary data to the server action */}
                    <input type="hidden" name="userId" value={user?.uid || 'guest'} />
                    <input type="hidden" name="locationId" value={selectedLocation.id} />
                    <input type="hidden" name="cartItems" value={JSON.stringify(items)} />
                    {birthDate && <input type="hidden" name="customerBirthDate" value={birthDate.toISOString()} />}

                    {/* Form Fields */}
                    <div>
                        <Label htmlFor="customerName">Full Name</Label>
                        <Input id="customerName" name="customerName" required defaultValue={user?.displayName || ''} />
                        {state?.fieldErrors?.customerName && <p className="text-sm text-destructive mt-1">{state.fieldErrors.customerName[0]}</p>}
                    </div>

                    <div>
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input id="customerEmail" name="customerEmail" type="email" required defaultValue={user?.email || ''} />
                        {state?.fieldErrors?.customerEmail && <p className="text-sm text-destructive mt-1">{state.fieldErrors.customerEmail[0]}</p>}
                    </div>

                    <div>
                        <Label htmlFor="customerPhone">Phone Number</Label>
                        <Input id="customerPhone" name="customerPhone" type="tel" required defaultValue={user?.phoneNumber || ''} />
                        {state?.fieldErrors?.customerPhone && <p className="text-sm text-destructive mt-1">{state.fieldErrors.customerPhone[0]}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="birthDate">Date of Birth</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !birthDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Calendar
                                        mode="single"
                                        selected={birthDate}
                                        onSelect={setBirthDate}
                                        initialFocus
                                        captionLayout="dropdown-buttons"
                                        fromYear={1920}
                                        toYear={new Date().getFullYear()}
                                    />
                                </Suspense>
                            </PopoverContent>
                        </Popover>
                        {state?.fieldErrors?.customerBirthDate && <p className="text-sm text-destructive mt-1">{state.fieldErrors.customerBirthDate[0]}</p>}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="idImage">Upload ID (Required)</Label>
                        <Label htmlFor="idImage" className={cn("flex items-center gap-2 cursor-pointer rounded-md border border-input px-3 py-2 text-sm", idImageName ? "text-primary" : "text-muted-foreground")}>
                            <Upload className="h-4 w-4" />
                            <span className='truncate flex-1'>{idImageName || 'Upload a photo of your ID'}</span>
                        </Label>
                        <Input id="idImage" name="idImage" type="file" className="hidden" accept="image/*" onChange={handleFileChange} required/>
                         {state?.fieldErrors?.idImage && <p className="text-sm text-destructive mt-1">{state.fieldErrors.idImage[0]}</p>}
                    </div>
                    
                    {state?.message && state.error && (
                        <Alert variant='destructive'>
                            <AlertTitle>Submission Error</AlertTitle>
                            <AlertDescription>{state.message}</AlertDescription>
                        </Alert>
                    )}
                    
                    <SubmitButton />
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
