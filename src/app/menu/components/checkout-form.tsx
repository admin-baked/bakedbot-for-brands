'use client';

import { useState, useEffect, useActionState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/hooks/use-cart';
import type { Location } from '@/lib/types';
import { Loader2, Send, MapPin, Upload, CalendarIcon, FlaskConical } from 'lucide-react';
import { haversineDistance } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { submitOrder } from './actions';
import { useFormStatus } from 'react-dom';
import { useUser } from '@/firebase';
import { useMenuData } from '@/hooks/use-menu-data';
import { useStore } from '@/hooks/use-store';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

type LocationWithDistance = Location & { distance?: number };

const initialState = {
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
    const { items, getCartTotal } = useCart();
    const { locations, isUsingDemoData } = useMenuData();
    const { toast } = useToast();
    const { user } = useUser();
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(submitOrder, initialState);
    
    const { selectedLocationId, setSelectedLocationId } = useStore();

    const [isLocating, setIsLocating] = useState(true);
    const [sortedLocations, setSortedLocations] = useState<LocationWithDistance[]>([]);
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
            if (!state.error && state.orderId) {
                onOrderSuccess(state.orderId);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Order Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast, onOrderSuccess]);


    const subtotal = getCartTotal(selectedLocationId);
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
    
    const fillWithTestData = () => {
        if (!formRef.current) return;
        formRef.current.customerName.value = 'Martez Smith';
        formRef.current.customerEmail.value = 'martez@bakedbot.ai';
        formRef.current.customerPhone.value = '555-123-4567';
        setBirthDate(new Date('1990-01-15'));
        
        // You might need a more robust way to handle file inputs for testing,
        // but for now, we'll just indicate a file could be there.
        setIdImageName('test_id.jpg');

        // Select the first location if available
        if (sortedLocations.length > 0 && sortedLocations[0].id) {
            setSelectedLocationId(sortedLocations[0].id);
        }
        
        toast({
            title: 'Test Data Filled',
            description: 'The form has been populated with test data.',
        });
    };

    const handleSubmit = (formData: FormData) => {
        formData.append('cartItems', JSON.stringify(items));
        formData.append('userId', user?.uid || 'guest');
        formData.append('totalAmount', String(total));
        formData.append('locations', JSON.stringify(sortedLocations));
        if (birthDate) {
            formData.append('customerBirthDate', birthDate.toISOString());
        }
        if (!formData.has('locationId') && selectedLocationId) {
             formData.append('locationId', selectedLocationId);
        }
        formAction(formData);
    };

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6">
             <div>
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-semibold">Your Information</h3>
                     {isUsingDemoData && (
                        <Button type="button" variant="outline" size="sm" onClick={fillWithTestData}>
                           <FlaskConical className="mr-2 h-4 w-4" /> Test Checkout
                       </Button>
                     )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="customerName" required defaultValue={user?.displayName || ''} />
                        {state.fieldErrors?.customerName && <p className="text-sm text-destructive">{state.fieldErrors.customerName[0]}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="customerEmail" type="email" required defaultValue={user?.email || ''} />
                        {state.fieldErrors?.customerEmail && <p className="text-sm text-destructive">{state.fieldErrors.customerEmail[0]}</p>}
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="customerPhone" type="tel" placeholder="(555) 123-4567" required defaultValue={user?.phoneNumber || ''} />
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

            <div>
              <h3 className="text-lg font-semibold">Pickup Location</h3>
              <RadioGroup name="locationId" className="mt-4" value={selectedLocationId || ''} onValueChange={setSelectedLocationId}>
                  {isLocating && <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                  
                  <ScrollArea className="w-full whitespace-nowrap">
                      <div className="flex space-x-4 pb-4">
                          {sortedLocations.length > 0 ? (
                              sortedLocations.map(loc => (
                                  <div key={loc.id} className="w-64">
                                      <RadioGroupItem value={loc.id} id={`checkout-${loc.id}`} className="peer sr-only" />
                                      <Label htmlFor={`checkout-${loc.id}`} className="block h-full cursor-pointer rounded-lg border bg-card p-4 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                          <div className="flex flex-col justify-between h-full">
                                              <div>
                                                  <p className="font-semibold">{loc.name}</p>
                                                  <p className="text-sm text-muted-foreground">{loc.address}, {loc.city}</p>
                                              </div>
                                              {loc.distance && <p className="text-sm font-bold mt-2">{loc.distance.toFixed(1)} mi</p>}
                                          </div>
                                      </Label>
                                  </div>
                              ))
                          ) : (
                              <p className="text-sm text-muted-foreground">No locations configured.</p>
                          )}
                      </div>
                      <ScrollBar orientation="horizontal" />
                  </ScrollArea>
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
                <SubmitButton disabled={isAgeInvalid || !birthDate} />
                <Button variant="outline" className="w-full" onClick={onBack}>
                    Back to Cart
                </Button>
            </div>
        </form>
    )
}
