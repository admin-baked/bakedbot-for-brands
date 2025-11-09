
'use client';

import { useActionState, useTransition } from 'react';
import { Upload } from 'lucide-react';
import { submitOrder } from './actions';
import { useUser } from '@/firebase';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


const initialState = {
  message: '',
  error: false,
  fieldErrors: {},
  orderId: null,
};

export function CheckoutForm({ onOrderSuccess, onBack }: { onOrderSuccess: (orderId: string) => void; onBack: () => void; }) {
  const { user } = useUser();
  const { items: cart, getCartTotal } = useCart();
  const { selectedLocationId, locations } = useStore();
  const [state, formAction] = useActionState(submitOrder, initialState);
  const [isPending, startTransition] = useTransition();

  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [idImageName, setIdImageName] = useState<string | null>(null);

  const subtotal = getCartTotal();
  const taxes = subtotal * 0.15; // Example 15% tax rate
  const total = subtotal + taxes;

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  useEffect(() => {
    if (!isPending && state) {
      if (state.error === false && state.orderId) {
        onOrderSuccess(state.orderId);
      } else if (state.error === true) {
        alert(`Error: ${state.message || 'An unknown error occurred.'}`);
      }
    }
  }, [state, isPending, onOrderSuccess]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setIdImageName(file ? file.name : null);
  };
  
  if (!selectedLocationId || !selectedLocation) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
        ⚠️ Please select a pickup location first
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
        ⚠️ Your cart is empty
      </div>
    );
  }

  return (
     <div className="space-y-6">
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            {cart.map(item => (
            <div key={item.id} className="flex justify-between mb-2">
                <span>{item.name} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            ))}
            <hr className="my-3" />
            <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
            <span>Taxes (est.)</span>
            <span>${taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
            </div>
      </div>
      
        <form 
            action={(formData) => startTransition(() => formAction(formData))} 
            className="space-y-4"
        >
            <input type="hidden" name="userId" value={user?.uid || 'guest'} />
            <input type="hidden" name="locationId" value={selectedLocationId} />
            <input type="hidden" name="locationName" value={selectedLocation.name} />
            <input type="hidden" name="cartItems" value={JSON.stringify(cart)} />
            <input type="hidden" name="totalAmount" value={String(total)} />
            {birthDate && <input type="hidden" name="customerBirthDate" value={birthDate.toISOString()} />}

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
                        <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={setBirthDate}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1920}
                        toYear={new Date().getFullYear()}
                        />
                    </PopoverContent>
                </Popover>
                 {state?.fieldErrors?.customerBirthDate && <p className="text-sm text-destructive mt-1">{state.fieldErrors.customerBirthDate[0]}</p>}
            </div>

            <div className="space-y-1">
                <Label htmlFor="idImage">Upload ID</Label>
                <Label htmlFor="idImage" className={cn("flex items-center gap-2 cursor-pointer rounded-md border border-input px-3 py-2 text-sm", idImageName ? "text-primary" : "text-muted-foreground")}>
                    <Upload className="h-4 w-4" />
                    <span className='truncate flex-1'>{idImageName || 'Upload a photo of your ID'}</span>
                </Label>
                <Input id="idImage" name="idImage" type="file" className="hidden" accept="image/*" onChange={handleFileChange} required/>
            </div>
            
            {state?.message && !state.success && (
                <div className="p-4 rounded bg-red-100 text-red-800">
                    ❌ {state.message}
                </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 animate-spin" /> : null}
                Submit Order
            </Button>
            <Button variant="outline" className="w-full" onClick={onBack} disabled={isPending}>
                Back to Cart
            </Button>
        </form>
    </div>
  );
}
