'use client';

/**
 * Add Driver Dialog Component
 *
 * Modal form for adding new delivery drivers
 * Validates license, age (21+), and vehicle information
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createDriver } from '@/server/actions/driver';
import { Loader2 } from 'lucide-react';

interface AddDriverDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    orgId: string;
}

export function AddDriverDialog({ open, onOpenChange, onSuccess, orgId }: AddDriverDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        licenseNumber: '',
        licenseState: 'NY',
        licenseExpiry: '',
        vehicleType: 'car',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehiclePlate: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await createDriver({
                orgId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                email: formData.email,
                licenseNumber: formData.licenseNumber,
                licenseState: formData.licenseState,
                licenseExpiry: new Date(formData.licenseExpiry),
                vehicleType: formData.vehicleType as any,
                vehicleMake: formData.vehicleMake || undefined,
                vehicleModel: formData.vehicleModel || undefined,
                vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
                vehiclePlate: formData.vehiclePlate || undefined,
            });

            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Driver added successfully',
                });
                // Reset form
                setFormData({
                    firstName: '',
                    lastName: '',
                    phone: '',
                    email: '',
                    licenseNumber: '',
                    licenseState: 'NY',
                    licenseExpiry: '',
                    vehicleType: 'car',
                    vehicleMake: '',
                    vehicleModel: '',
                    vehicleYear: '',
                    vehiclePlate: '',
                });
                onSuccess();
                onOpenChange(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to add driver',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An unexpected error occurred',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Driver</DialogTitle>
                    <DialogDescription>
                        Enter driver information. All drivers must be 21+ (NY OCM requirement).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Personal Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name *</Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, firstName: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, lastName: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone *</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData({ ...formData, phone: e.target.value })
                                    }
                                    placeholder="(555) 123-4567"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Driver License */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Driver License</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="licenseNumber">License Number *</Label>
                                <Input
                                    id="licenseNumber"
                                    value={formData.licenseNumber}
                                    onChange={(e) =>
                                        setFormData({ ...formData, licenseNumber: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="licenseState">State *</Label>
                                <Select
                                    value={formData.licenseState}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, licenseState: value })
                                    }
                                >
                                    <SelectTrigger id="licenseState">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NY">New York</SelectItem>
                                        <SelectItem value="NJ">New Jersey</SelectItem>
                                        <SelectItem value="PA">Pennsylvania</SelectItem>
                                        <SelectItem value="CT">Connecticut</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="licenseExpiry">Expiry Date *</Label>
                                <Input
                                    id="licenseExpiry"
                                    type="date"
                                    value={formData.licenseExpiry}
                                    onChange={(e) =>
                                        setFormData({ ...formData, licenseExpiry: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Vehicle Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                                <Select
                                    value={formData.vehicleType}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, vehicleType: value })
                                    }
                                >
                                    <SelectTrigger id="vehicleType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="car">Car</SelectItem>
                                        <SelectItem value="van">Van</SelectItem>
                                        <SelectItem value="bike">Bike</SelectItem>
                                        <SelectItem value="scooter">Scooter</SelectItem>
                                        <SelectItem value="foot">On Foot</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehiclePlate">License Plate</Label>
                                <Input
                                    id="vehiclePlate"
                                    value={formData.vehiclePlate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, vehiclePlate: e.target.value })
                                    }
                                    placeholder="ABC1234"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicleMake">Make</Label>
                                <Input
                                    id="vehicleMake"
                                    value={formData.vehicleMake}
                                    onChange={(e) =>
                                        setFormData({ ...formData, vehicleMake: e.target.value })
                                    }
                                    placeholder="Toyota"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicleModel">Model</Label>
                                <Input
                                    id="vehicleModel"
                                    value={formData.vehicleModel}
                                    onChange={(e) =>
                                        setFormData({ ...formData, vehicleModel: e.target.value })
                                    }
                                    placeholder="Camry"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicleYear">Year</Label>
                                <Input
                                    id="vehicleYear"
                                    type="number"
                                    min="1900"
                                    max={new Date().getFullYear() + 1}
                                    value={formData.vehicleYear}
                                    onChange={(e) =>
                                        setFormData({ ...formData, vehicleYear: e.target.value })
                                    }
                                    placeholder="2020"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Driver
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
