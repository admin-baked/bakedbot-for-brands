'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, Database } from "lucide-react";
import Link from "next/link";
import { importProductsFromCsv } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const initialState = {
  message: '',
  error: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Import Products
    </Button>
  );
}

export default function DataSourceSettings() {
    const [state, formAction] = useFormState(importProductsFromCsv, initialState);
    const { toast } = useToast();
    const [fileName, setFileName] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.error ? 'Import Failed' : 'Success',
                description: state.message,
                variant: state.error ? 'destructive' : 'default',
            });
            if (!state.error) {
              formRef.current?.reset();
              setFileName(null);
            }
        }
    }, [state, toast]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
        } else {
            setFileName(null);
        }
    };

    return (
        <Card>
            <form action={formAction} ref={formRef}>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>
                        Import your products from a CSV file to make them available to the AI chatbot and public menu.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <Database className="h-4 w-4" />
                        <AlertTitle>Live Data Mode Active</AlertTitle>
                        <AlertDescription>
                            The application is connected to your live Firestore product catalog. If the catalog is empty, it will automatically fall back to demo data.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label>Upload Product Catalog (CSV)</Label>
                        <div className="flex items-center justify-center w-full">
                            <Label htmlFor="product-csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
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
                                <Input id="product-csv-upload" name="product-csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                            </Label>
                        </div>
                    </div>
                     <div className="text-sm">
                        <p className="text-muted-foreground">
                            Make sure your CSV file is formatted correctly.
                        </p>
                        <Button variant="link" asChild className="p-0 h-auto">
                            <Link href="/sample-products.csv" download>
                               <Download className="mr-2" /> Download sample .csv
                            </Link>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}