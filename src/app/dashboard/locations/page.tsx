
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, Download, PlusCircle, MapPin, Trash2, Pencil, Mail } from 'lucide-react';
import { useStore, type Location } from '@/hooks/use-store';
import Link from 'next/link';
import DeleteLocationDialog from './components/delete-location-dialog';
import EditLocationDialog from './components/edit-location-dialog';
import { useToast } from '@/hooks/use-toast';
import * as Papa from 'papaparse';


export default function LocationsPage() {
  const { locations, addLocation, setLocations, isCeoMode } = useStore();
  const formRef = React.useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const [dialogState, setDialogState] = React.useState<{
    deleteOpen: boolean;
    editOpen: boolean;
    selectedLocation: Location | null;
  }>({
    deleteOpen: false,
    editOpen: false,
    selectedLocation: null,
  });

  const handleAddLocation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLocation: Omit<Location, 'id'> = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip: formData.get('zip') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
    };
    
    if (newLocation.name && newLocation.address && newLocation.city && newLocation.state && newLocation.zip) {
        addLocation({ ...newLocation, id: Date.now().toString() });
        toast({
            title: 'Location Added',
            description: `${newLocation.name} has been successfully added.`
        })
        formRef.current?.reset();
    } else {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please fill out all required location fields.',
        })
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const newLocations = results.data.map((row: any) => ({
                    id: row.id || Date.now().toString(),
                    name: row.name,
                    address: row.address,
                    city: row.city,
                    state: row.state,
                    zip: row.zip,
                    phone: row.phone,
                    email: row.email,
                    lat: parseFloat(row.lat),
                    lon: parseFloat(row.lon),
                }));
                setLocations(newLocations);
                toast({
                    title: 'Locations Imported',
                    description: `Successfully imported ${newLocations.length} locations.`,
                });
            },
            error: (error) => {
                 toast({
                    variant: 'destructive',
                    title: 'CSV Import Failed',
                    description: error.message,
                });
            }
        });
    }
  };

  const openDeleteDialog = (location: Location) => {
    setDialogState({ ...dialogState, deleteOpen: true, selectedLocation: location });
  };

  const openEditDialog = (location: Location) => {
    setDialogState({ ...dialogState, editOpen: true, selectedLocation: location });
  };

  const currentLocations = locations;

  return (
    <>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage your dispensary locations for the product locator.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card>
            <form onSubmit={handleAddLocation} ref={formRef}>
              <CardHeader>
                <CardTitle>Add a Location</CardTitle>
                <CardDescription>Manually enter a single dispensary location.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loc-name">Location Name</Label>
                  <Input id="loc-name" name="name" placeholder="e.g., Green Leaf Central" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc-address">Street Address</Label>
                  <Input id="loc-address" name="address" placeholder="123 Main St" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loc-city">City</Label>
                    <Input id="loc-city" name="city" placeholder="Metropolis" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-state">State</Label>
                    <Input id="loc-state" name="state" placeholder="IL" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-zip">Zip Code</Label>
                    <Input id="loc-zip" name="zip" placeholder="12345" required />
                  </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="loc-phone">Phone Number</Label>
                        <Input id="loc-phone" name="phone" type="tel" placeholder="(555) 123-4567" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="loc-email">Fulfillment Email</Label>
                        <Input id="loc-email" name="email" type="email" placeholder="orders@example.com" />
                    </div>
                 </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">
                  <PlusCircle className="mr-2" /> Add Location
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="space-y-8">
              <Card>
                  <CardHeader>
                      <CardTitle>Bulk Import</CardTitle>
                      <CardDescription>Upload a CSV file with multiple locations.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-muted-foreground">CSV file up to 5MB</p>
                          </div>
                          <Input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} />
                      </Label>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2">
                      <p className="text-sm text-muted-foreground">
                          Make sure your CSV is formatted correctly.
                      </p>
                      <Button variant="link" asChild className="p-0 h-auto">
                          <Link href="/sample-locations.csv" download>
                              <Download className="mr-2" /> Download sample .csv
                          </Link>
                      </Button>
                  </CardFooter>
              </Card>
          </div>
        </div>
        
         <Card>
          <CardHeader>
            <CardTitle>Your Locations</CardTitle>
            <CardDescription>
              A list of your saved dispensary locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
              {currentLocations.length > 0 ? (
                  <div className="divide-y divide-border rounded-md border">
                      {currentLocations.map((loc) => (
                          <div key={loc.id} className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                  <MapPin className="h-5 w-5 text-muted-foreground" />
                                  <div className="flex-1">
                                      <p className="font-medium">{loc.name}</p>
                                      <p className="text-sm text-muted-foreground">{loc.address}, {loc.city}, {loc.state} {loc.zip}</p>
                                      {loc.email && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                                            <Mail className="h-3 w-3"/> {loc.email}
                                        </p>
                                      )}
                                  </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {isCeoMode && (
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(loc)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(loc)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-12 text-muted-foreground">
                      <MapPin className="mx-auto h-12 w-12" />
                      <p className="mt-4">No locations added yet.</p>
                      <p className="text-sm">Add a location using the form above.</p>
                  </div>
              )}
          </CardContent>
        </Card>
      </div>

      <DeleteLocationDialog
        isOpen={dialogState.deleteOpen}
        setIsOpen={(open) => setDialogState(prev => ({...prev, deleteOpen: open}))}
        location={dialogState.selectedLocation}
      />

       <EditLocationDialog
        isOpen={dialogState.editOpen}
        setIsOpen={(open) => setDialogState(prev => ({...prev, editOpen: open}))}
        location={dialogState.selectedLocation}
      />
    </>
  );
}
