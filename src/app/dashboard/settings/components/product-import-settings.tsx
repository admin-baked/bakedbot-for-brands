
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function ProductImportSettings() {
    const [fileName, setFileName] = React.useState<string | null>(null);

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
            <form>
                <CardHeader>
                    <CardTitle>Product Catalog</CardTitle>
                    <CardDescription>
                        Import your products from a CSV file to make them available to the AI chatbot.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Upload Products</Label>
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
                                <Input id="product-csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
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
                    <Button type="submit">Import Products</Button>
                </CardFooter>
            </form>
        </Card>
    );
}
