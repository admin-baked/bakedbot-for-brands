'use client';

import { useState, useEffect, useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/hooks/use-cart';
import type { Location } from '@/lib/types';
import { Loader2, Send, MapPin } from 'lucide-react';
import { haversineDistance } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { submitOrder } from './actions';
import { useFormStatus } from 'react-dom';
import { useUser } from '@/firebase';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';

type LocationWithDistance = Location & { distance?: number };

const initialState = {
    message: '',
    error: false,
    fieldErrors: {},
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Order
        </Button>
    )
}

export default function CheckoutForm({ onOrderSuccess, onBack }: { onOrderSuccess: () => void; onBack: () => void; }) {
    const { items, getCartTotal, clearCart } = useCart();
    const { locations } = useMenuData();
    const { toast } = useToast();
    const { user } = useUser();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(submitOrder, initialState);
    
    const { selectedLocationId, setSelectedLocationId } = useStore();

    const [isLocating, setIsLocating] = useState(true);
    const [sortedLocations, setSortedLocations] = useState<LocationWithDistance[]>([]);
    
    useEffect(() => {
        if (!locations) {
            setIsLocating(true);
            return;
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    const locationsWithDistance = locations
                        .filter(loc => loc.lat && loc.lon)
                        .map(loc => {
                            const distance = haversineDistance(userCoords, { lat: loc.lat!, lon: loc.lon! });
                            return { ...loc, distance };
                        })
                        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

                    setSortedLocations(locationsWithDistance);
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setSortedLocations(locations); // Fallback to unsorted list
                    setIsLocating(false);
                }
            );
        } else {
            setSortedLocations(locations); // Fallback for browsers without geolocation
            setIsLocating(false);
        }
    }, [locations]);


    useEffect(() => {
        if (state.message) {
            if (!state.error) {
                clearCart();
                onOrderSuccess();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Order Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast, clearCart, onOrderSuccess]);


    const subtotal = getCartTotal(selectedLocationId);
    const taxes = subtotal * 0.15; // Example 15% tax rate
    const total = subtotal + taxes;

    const handleSubmit = (formData: FormData) => {
        formData.append('cartItems', JSON.stringify(items));
        formData.append('userId', user?.uid || 'guest');
        formData.append('totalAmount', String(total));
        formData.append('locations', JSON.stringify(sortedLocations));
        // Ensure the selectedLocationId is on the form data if it's not already
        if (!formData.has('locationId') && selectedLocationId) {
             formData.append('locationId', selectedLocationId);
        }
        formAction(formData);
    };

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6">
             <div>
                <h3 className="text-lg font-semibold">Your Information</h3>
                <div className="mt-4 grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="customerName" required defaultValue={user?.displayName || ''} />
                        {state.fieldErrors?.customerName && <p className="text-sm text-destructive">{state.fieldErrors.customerName[0]}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="customerPhone" type="tel" placeholder="(555) 123-4567" required defaultValue={user?.phoneNumber || ''} />
                        {state.fieldErrors?.customerPhone && <p className="text-sm text-destructive">{state.fieldErrors.customerPhone[0]}</p>}
                    </div>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold">Pickup Location</h3>
                <RadioGroup name="locationId" className="mt-4 space-y-2" value={selectedLocationId || ''} onValueChange={setSelectedLocationId}>
                    {isLocating && <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                    {sortedLocations.length > 0 ? (
                        sortedLocations.map(loc => (
                            <div key={loc.id}>
                                <RadioGroupItem value={loc.id} id={`checkout-${loc.id}`} className="peer sr-only" />
                                <Label htmlFor={`checkout-${loc.id}`} className="block cursor-pointer rounded-lg border bg-card p-4 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                    <div className="flex items-start justify-between">
                                        <div className='flex-1'>
                                            <p className="font-semibold">{loc.name}</p>
                                            <p className="text-sm text-muted-foreground">{loc.address}, {loc.city}</p>
                                        </div>
                                        {loc.distance && <p className="text-sm font-bold">{loc.distance.toFixed(1)} mi</p>}
                                    </div>
                                </Label>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No locations configured.</p>
                    )}
                </RadioGroup>
                {state.fieldErrors?.locationId && <p className="mt-2 text-sm text-destructive">{state.fieldErrors.locationId[0]}</p>}
            </div>
             <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
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
                <SubmitButton />
                <Button variant="outline" className="w-full" onClick={onBack}>
                    Back to Cart
                </Button>
            </div>
        </form>
    )
}
