'use client';

import { useState, useEffect, useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/hooks/use-cart';
import { useStore, type Location } from '@/hooks/use-store';
import { Loader2, Send } from 'lucide-react';
import { haversineDistance } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { submitOrder } from './actions';
import { useFormStatus } from 'react-dom';
import { useUser } from '@/firebase';
import { demoLocations } from '@/lib/data';

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
    const { locations: storeLocations, isDemoMode } = useStore();
    const { toast } = useToast();
    const { user } = useUser();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(submitOrder, initialState);

    const [userCoords, setUserCoords] = useState<{ lat: number, lon: number} | null>(null);
    const [isLocating, setIsLocating] = useState(true);
    const [sortedLocations, setSortedLocations] = useState<LocationWithDistance[]>([]);
    
    const locations = isDemoMode ? demoLocations : storeLocations;

    useEffect(() => {
        if (isDemoMode) {
            // In demo mode, bypass geolocation and use predefined demo locations
            const demoCoords = { lat: 41.8781, lon: -87.6298 }; // Central Chicago
            const demoLocationsWithDistance = demoLocations.map(loc => {
                const distance = haversineDistance(demoCoords, { lat: loc.lat!, lon: loc.lon! });
                return { ...loc, distance };
            }).sort((a, b) => a.distance - b.distance);
            setSortedLocations(demoLocationsWithDistance);
            setIsLocating(false);
            return;
        }

        // Live mode logic
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    setUserCoords(coords);
                    const locationsWithDistance = locations.map(loc => {
                        if (loc.lat && loc.lon) {
                            const distance = haversineDistance(coords, { lat: loc.lat, lon: loc.lon });
                            return { ...loc, distance };
                        }
                        return loc;
                    }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
                    setSortedLocations(locationsWithDistance);
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setSortedLocations(locations);
                    setIsLocating(false);
                }
            );
        } else {
            setSortedLocations(locations);
            setIsLocating(false);
        }
    }, [isDemoMode, storeLocations, locations]);


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


    const subtotal = getCartTotal();
    const taxes = subtotal * 0.15; // Example 15% tax rate
    const total = subtotal + taxes;

    const handleSubmit = (formData: FormData) => {
        formData.append('cartItems', JSON.stringify(items));
        formData.append('userId', user?.uid || 'guest');
        formData.append('totalAmount', String(total));
        formAction(formData);
    };

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-4">
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
                <div className="mt-4 space-y-1">
                    <Label htmlFor="location">Select a dispensary</Label>
                    <Select name="locationId" required>
                        <SelectTrigger id="location" disabled={isLocating}>
                            <SelectValue placeholder={isLocating ? 'Finding nearby locations...' : 'Choose a pickup location'} />
                        </SelectTrigger>
                        <SelectContent>
                            {isLocating && <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                            {sortedLocations.length > 0 ? (
                                sortedLocations.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                        {loc.name} - {loc.city}
                                        {loc.distance && (
                                            <span className='ml-2 text-xs text-muted-foreground'>
                                                ({loc.distance.toFixed(1)} miles away)
                                            </span>
                                        )}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>No locations configured.</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {state.fieldErrors?.locationId && <p className="text-sm text-destructive">{state.fieldErrors.locationId[0]}</p>}
                </div>
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
