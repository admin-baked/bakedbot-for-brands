'use client';
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Trash2, Pencil, Mail } from 'lucide-react';
import DeleteLocationDialog from './components/delete-location-dialog';
import EditLocationDialog from './components/edit-location-dialog';
import type { Retailer } from '@/firebase/converters';
import { useMenuData } from '@/hooks/use-menu-data';


export default function LocationsPage() {
  const { locations, isLoading: areLocationsLoading } = useMenuData();
  
  const [dialogState, setDialogState] = React.useState<{
    deleteOpen: boolean;
    editOpen: boolean;
    selectedLocation: Retailer | null;
  }>({
    deleteOpen: false,
    editOpen: false,
    selectedLocation: null,
  });


  const openDeleteDialog = (location: Retailer) => {
    setDialogState({ ...dialogState, deleteOpen: true, selectedLocation: location });
  };

  const openEditDialog = (location: Retailer) => {
    setDialogState({ ...dialogState, editOpen: true, selectedLocation: location });
  };


  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
                <p className="text-muted-foreground">
                    Manage your dispensary locations. Use the Settings page to add or import new locations.
                </p>
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
                      <p className="text-sm">Add or import locations in the Settings page to see them here.</p>
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
