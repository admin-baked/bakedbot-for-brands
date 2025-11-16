
'use client';
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, MapPin, Trash2, Pencil, Mail, Loader2 } from 'lucide-react';
import DeleteLocationDialog from './components/delete-location-dialog';
import EditLocationDialog from './components/edit-location-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Location } from '@/firebase/converters';
import { useMenuData } from '@/hooks/use-menu-data';
import { useFormState, useFormStatus } from 'react-dom';
import { addLocationAction } from './actions';


const initialState = { message: '', error: false };

function AddLocationSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 animate-spin" /> : <PlusCircle className="mr-2" />}
            Add Location
        </Button>
    );
}

export default function LocationsPage() {
  const { locations, isLoading: areLocationsLoading } = useMenuData();
  const formRef = React.useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  
  const [addState, addFormAction] = useFormState(addLocationAction, initialState);

  const [dialogState, setDialogState] = React.useState<{
    deleteOpen: boolean;
    editOpen: boolean;
    selectedLocation: Location | null;
  }>({
    deleteOpen: false,
    editOpen: false,
    selectedLocation: null,
  });

  React.useEffect(() => {
    if (addState.message) {
        toast({
            title: addState.error ? 'Error' : 'Success',
            description: addState.message,
            variant: addState.error ? 'destructive' : 'default',
        });
        if (!addState.error) {
            formRef.current?.reset();
        }
    }
  }, [addState, toast]);

  const openDeleteDialog = (location: Location) => {
    setDialogState({ ...dialogState, deleteOpen: true, selectedLocation: location });
  };

  const openEditDialog = (location: Location) => {
    setDialogState({ ...dialogState, editOpen: true, selectedLocation: location });
  };


  return (
    <>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage your dispensary locations for the product locator. Add locations here or bulk import them from the Settings page.
          </p>
        </div>
        
         <Card>
          <CardHeader>
            <CardTitle>Your Locations</CardTitle>
            <CardDescription>
              A list of your saved dispensary locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
              {areLocationsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : locations.length > 0 ? (
                  <div className="divide-y divide-border rounded-md border">
                      {locations.map((loc) => (
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
                                
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(loc)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                
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
                      <p className="text-sm">Add a location using the form in Settings.</p>
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
