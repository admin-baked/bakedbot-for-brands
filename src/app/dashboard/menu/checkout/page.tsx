'use client';

import { useState, useEffect, useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/hooks/use-cart';
import { useStore, type Location } from '@/hooks/use-store';
import Link from 'next/link';
import Image from 'next/image';
import { PartyPopper, Loader2, Send } from 'lucide-react';
import { haversineDistance } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { submitOrder } from './actions';
import { useFormStatus } from 'react-dom';
import { useUser } from '@/firebase';

type LocationWithDistance = Location & { distance?: number };

const initialState = {
    message: '',
    error: false,
    fieldErrors: {},
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full md:w-auto" disabled={pending}>
            {pending ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Order
        </Button>
    )
}

export default function CheckoutPage() {
    const { items, getCartTotal, clearCart } = useCart();
    const { locations: storeLocations, isDemoMode } = useStore();
    const { toast } = useToast();
    const { user } = useUser();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(submitOrder, initialState);

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [userCoords, setUserCoords] = useState<{ lat: number, lon: number} | null>(null);
    const [isLocating, setIsLocating] = useState(true);
    const [sortedLocations, setSortedLocations] = useState<LocationWithDistance[]>([]);
    
    // In demo mode, use the demo locations with coordinates
    const locations = isDemoMode 
        ? [
            { id: 'demo1', name: 'Green Leaf Central', address: '123 Main St', city: 'Metropolis', state: 'IL', zip: '12345', phone: '(555) 123-4567', lat: 40.7128, lon: -74.0060 },
            { id: 'demo2', name: 'Herbal Haven Downtown', address: '456 Oak Ave', city: 'Metropolis', state: 'IL', zip: '12346', phone: '(555) 987-6543', lat: 40.7580, lon: -73.9855 },
            { id: 'demo3', name: 'Bloom Apothecary North', address: '789 Pine Ln', city: 'Springfield', state: 'IL', zip: '67890', phone: '(555) 234-5678', lat: 39.7817, lon: -89.6501 },
        ] 
        : storeLocations;

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserCoords({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast({
                        variant: 'destructive',
                        title: 'Location Error',
                        description: 'Could not get your location. Please select a dispensary manually.'
                    });
                    // If user denies location, just use the original list
                    setSortedLocations(locations);
                    setIsLocating(false);
                }
            );
        } else {
            // Geolocation not supported
            setSortedLocations(locations);
            setIsLocating(false);
        }
    }, []);

    useEffect(() => {
        if (userCoords) {
            const locationsWithDistance = locations
                .map(loc => {
                    if (loc.lat && loc.lon) {
                        const distance = haversineDistance(userCoords, { lat: loc.lat, lon: loc.lon });
                        return { ...loc, distance };
                    }
                    return loc;
                })
                .sort((a, b) => {
                    if (a.distance && b.distance) {
                        return a.distance - b.distance;
                    }
                    // Keep original order if distances are not available
                    return 0;
                });
            setSortedLocations(locationsWithDistance);
        } else {
            setSortedLocations(locations);
        }
    }, [userCoords, locations]);

    useEffect(() => {
        if (state.message) {
            if (!state.error) {
                clearCart();
                setIsSubmitted(true);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Order Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast, clearCart]);


    const subtotal = getCartTotal();
    const taxes = subtotal * 0.15; // Example 15% tax rate
    const total = subtotal + taxes;

    const handleSubmit = (formData: FormData) => {
        formData.append('cartItems', JSON.stringify(items));
        formData.append('userId', user?.uid || 'guest');
        formData.append('totalAmount', String(total));
        formAction(formData);
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <PartyPopper className="mx-auto h-16 w-16 text-primary" />
                        <CardTitle className="text-2xl mt-4">Order Submitted!</CardTitle>
                        <CardDescription>
                            Your order has been sent to the dispensary. You'll receive a notification when it's ready for pickup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className='w-full'>
                            <Link href="/dashboard/products">
                                Continue Shopping
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (items.length === 0) {
        return (
             <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Your Cart is Empty</CardTitle>
                        <CardDescription>
                           Add some items from the menu to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className='w-full'>
                            <Link href="/dashboard/products">
                                Return to Menu
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <form ref={formRef} action={handleSubmit}>
                    <CardHeader>
                        <CardTitle className="text-2xl">Checkout</CardTitle>
                        <CardDescription>
                            Confirm your order details and select a pickup location.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Side: Order Summary */}
                        <div className="space-y-4">
                             <h3 className="text-lg font-semibold">Order Summary</h3>
                             <div className="space-y-2">
                                {items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                                                <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
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
                        </div>

                        {/* Right Side: Customer Info & Pickup */}
                        <div className="space-y-6">
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
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col md:flex-row gap-2">
                         <Button variant="outline" asChild className='w-full md:w-auto'>
                            <Link href="/dashboard/products">
                                Cancel
                            </Link>
                        </Button>
                        <SubmitButton />
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
