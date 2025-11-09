
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/use-cart';
import { Loader2, Send, CalendarIcon, AlertTriangle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitOrder } from './actions';
import { useUser } from '@/firebase';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

const initialState: {
    message: string;
    error: boolean;
    fieldErrors?: any;
    orderId?: string | null;
} = {
    message: '',
    error: false,
    fieldErrors: {},
    orderId: null,
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending || disabled}>
            {pending ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Order
        </Button>
    )
}

export default function CheckoutForm({ onOrderSuccess, onBack }: { onOrderSuccess: (orderId: string) => void; onBack: () => void; }) {
    const { items, getCartTotal, clearCart } = useCart();
    const { toast } = useToast();
    const { user } = useUser();
    const [state, formAction] = useFormState(submitOrder, initialState);
    
    const { selectedLocationId } = useStore();
    const { locations } = useMenuData();

    const [birthDate, setBirthDate] = useState<Date | undefined>();
    const [idImageName, setIdImageName] = useState<string | null>(null);

     const isAgeInvalid = useMemo(() => {
        if (!birthDate) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age < 21;
    }, [birthDate]);

    useEffect(() => {
        if (state.message) {
            if (!state.error && state.orderId) {
                onOrderSuccess(state.orderId);
                clearCart(); // Clear cart on success
            } else if (state.error) {
                toast({
                    variant: 'destructive',
                    title: 'Order Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast, onOrderSuccess, clearCart]);


    const subtotal = getCartTotal();
    const taxes = subtotal * 0.15; // Example 15% tax rate
    const total = subtotal + taxes;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIdImageName(file.name);
        } else {
            setIdImageName(null);
        }
    };
    
    const handleSubmit = (formData: FormData) => {
        const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
        
        formData.append('cartItems', JSON.stringify(items));
        formData.append('userId', user?.uid || 'guest');
        formData.append('totalAmount', String(total));
        if (birthDate) {
            formData.append('customerBirthDate', birthDate.toISOString());
        }
        if (selectedLocation) {
            formData.append('locationName', selectedLocation.name);
        }
        formAction(formData);
    };

    if (!selectedLocationId) {
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please select a pickup location from the main menu before proceeding.
            </AlertDescription>
          </Alert>
        );
    }
    
    if (items.length === 0) {
        return (
             <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                 Your cart is empty. Add some items to proceed to checkout.
                </AlertDescription>
            </Alert>
        );
    }


    return (
        <form action={handleSubmit} className="space-y-6">
             <input type="hidden" name="locationId" value={selectedLocationId || ''} />
             <div>
                <h3 className="text-lg font-semibold">Your Information</h3>
                <div className="mt-4 grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="customerName">Full Name</Label>
                        <Input id="customerName" name="customerName" required defaultValue={user?.displayName || ''} />
                        {state.fieldErrors?.customerName && <p className="text-sm text-destructive">{state.fieldErrors.customerName[0]}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input id="customerEmail" name="customerEmail" type="email" required defaultValue={user?.email || ''} />
                        {state.fieldErrors?.customerEmail && <p className="text-sm text-destructive">{state.fieldErrors.customerEmail[0]}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="customerPhone">Phone Number</Label>
                        <Input id="customerPhone" name="customerPhone" type="tel" placeholder="(555) 123-4567" required defaultValue={user?.phoneNumber || ''} />
                        {state.fieldErrors?.customerPhone && <p className="text-sm text-destructive">{state.fieldErrors.customerPhone[0]}</p>}
                    </div>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold">Compliance</h3>
                <div className="mt-4 grid grid-cols-1 gap-4">
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
                         {state.fieldErrors?.customerBirthDate && <p className="text-sm text-destructive">{state.fieldErrors.customerBirthDate[0]}</p>}
                         {isAgeInvalid && <p className="text-sm text-destructive">You must be at least 21 years old.</p>}
                    </div>
                    <div className="space-y-1">
                         <Label htmlFor="idImage">Upload ID</Label>
                          <Label htmlFor="idImage" className={cn("flex items-center gap-2 cursor-pointer rounded-md border border-input px-3 py-2 text-sm", idImageName ? "text-primary" : "text-muted-foreground")}>
                            <Upload className="h-4 w-4" />
                            <span className='truncate flex-1'>{idImageName || 'Upload a photo of your ID'}</span>
                          </Label>
                         <Input id="idImage" name="idImage" type="file" className="hidden" accept="image/*" onChange={handleFileChange} required/>
                          {state.fieldErrors?.idImage && <p className="text-sm text-destructive">{state.fieldErrors.idImage[0]}</p>}
                    </div>
                </div>
            </div>
             <div className="border-t pt-4 space-y-2">
                 <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
                 {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                <div className="flex justify-between text-sm text-muted-foreground pt-2">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxes (est.)</span>
                    <span>${taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                </div>
            </div>
            <div className="space-y-2">
                <SubmitButton disabled={isAgeInvalid || !birthDate} />
                <Button variant="outline" className="w-full" onClick={onBack}>
                    Back to Cart
                </Button>
            </div>
        </form>
    )
}
