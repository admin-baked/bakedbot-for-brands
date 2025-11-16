
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, Database, TestTube2, PlusCircle, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import { importProductsFromCsv, importLocationsFromCsv, addProductAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useDemoMode } from '@/context/demo-mode';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/firebase/auth/use-user';


const CsvSubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2" />}
      {label}
    </Button>
  );
};

const AddProductSubmitButton = () => {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2" />}
            Add Product
        </Button>
    );
};


const CsvUploader = ({ formAction, fieldName, sampleUrl }: { formAction: (payload: FormData) => void, fieldName: string, sampleUrl: string }) => {
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setFileName(file ? file.name : null);
    };

    return (
        <form action={formAction}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Upload CSV File</Label>
                    <div className="flex items-center justify-center w-full">
                        <Label htmlFor={fieldName} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                {fileName ? (
                                    <p className="font-semibold text-sm text-primary">{fileName}</p>
                                ) : (
                                    <>
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-muted-foreground">CSV file up to 5MB</p>
                                    </>
                                )}
                            </div>
                            <Input id={fieldName} name={fieldName} type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                        </Label>
                    </div>
                </div>
                 <div className="text-sm">
                    <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={sampleUrl} download>
                           <Download className="mr-2" /> Download sample .csv
                        </Link>
                    </Button>
                </div>
            </CardContent>
            <CardFooter>
                <CsvSubmitButton label={`Import ${fieldName.includes('product') ? 'Products' : 'Locations'}`} />
            </CardFooter>
        </form>
    );
}

const AddProductForm = () => {
    const { user } = useUser();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [addState, addFormAction] = useFormState(addProductAction, { message: '', error: false });
    const formRef = useRef<HTMLFormElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (user) {
          user.getIdTokenResult().then((idTokenResult) => {
            setUserProfile(idTokenResult.claims);
          });
        }
      }, [user]);

    useEffect(() => {
        if (addState.message) {
            toast({
                title: addState.error ? 'Error' : 'Success',
                description: addState.message,
                variant: addState.error ? 'destructive' : 'default',
            });
            if (!addState.error) formRef.current?.reset();
        }
    }, [addState, toast]);

    return (
        <form action={addFormAction} ref={formRef}>
            <input type="hidden" name="brandId" value={userProfile?.brandId || 'default'} />
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="prod-id">Product ID</Label>
                        <Input id="prod-id" name="id" placeholder="e.g., cosmic-caramel-10mg" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="prod-name">Product Name</Label>
                        <Input id="prod-name" name="name" placeholder="e.g., Cosmic Caramels" required />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="prod-cat">Category</Label>
                        <Input id="prod-cat" name="category" placeholder="e.g., Edibles" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prod-price">Base Price</Label>
                        <Input id="prod-price" name="price" type="number" step="0.01" placeholder="25.00" required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="prod-img">Image URL</Label>
                    <Input id="prod-img" name="imageUrl" type="url" placeholder="https://..." required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="prod-desc">Description</Label>
                    <Textarea id="prod-desc" name="description" placeholder="Describe the product..." required />
                </div>
            </CardContent>
            <CardFooter>
                <AddProductSubmitButton />
            </CardFooter>
        </form>
    )
}

export default function DataSourceSettings() {
    const { isDemo, setIsDemo } = useDemoMode();
    const { toast } = useToast();

    const handleActionState = (state: { message: string, error: boolean } | null) => {
        if (state?.message) {
            toast({
                title: state.error ? 'Import Failed' : 'Success',
                description: state.message,
                variant: state.error ? 'destructive' : 'default',
            });
        }
    };
    
    const [productState, productFormAction] = useFormState(importProductsFromCsv, null);
    const [locationState, locationFormAction] = useFormState(importLocationsFromCsv, null);

    useEffect(() => handleActionState(productState), [productState]);
    useEffect(() => handleActionState(locationState), [locationState]);

    return (
        <Card id="data">
            <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                    Manage the data source for your application's menu, products, and locations.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant={isDemo ? "default" : "destructive"}>
                    {isDemo ? <TestTube2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                    <AlertTitle>{isDemo ? "Demo Mode Active" : "Live Data Mode Active"}</AlertTitle>
                    <AlertDescription>
                         {isDemo 
                            ? "The application is currently using static demo data. Toggle this off to connect to your live Firestore database."
                            : "The application is connected to your live Firestore product catalog. If the catalog is empty, it will fall back to demo data."
                        }
                    </AlertDescription>
                </Alert>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="demo-mode-switch" className="text-base">Use Demo Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable to use built-in sample products and locations.
                    </p>
                  </div>
                  <Switch
                    id="demo-mode-switch"
                    checked={isDemo}
                    onCheckedChange={setIsDemo}
                  />
                </div>
            </CardContent>
            
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="px-6 text-lg font-semibold">
                         <div className="flex items-center gap-2"><FileText /> Manage Products</div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <Tabs defaultValue="add" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="add">Add Single Product</TabsTrigger>
                                <TabsTrigger value="import">Import from CSV</TabsTrigger>
                            </TabsList>
                            <TabsContent value="add" className="mt-0">
                                <AddProductForm />
                            </TabsContent>
                             <TabsContent value="import" className="mt-0">
                                <CsvUploader formAction={productFormAction} fieldName="product-csv-upload" sampleUrl="/sample-products.csv" />
                            </TabsContent>
                       </Tabs>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger className="px-6 text-lg font-semibold">
                       <div className="flex items-center gap-2"><MapPin /> Manage Locations</div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CsvUploader formAction={locationFormAction} fieldName="location-csv-upload" sampleUrl="/sample-locations.csv" />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}
