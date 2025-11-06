
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import * as React from "react";

export default function BrandVoiceSettings() {
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
                    <CardTitle>Brand Voice Training</CardTitle>
                    <CardDescription>
                        Upload documents (e.g., brand guidelines, marketing copy) to train Smokey on your unique voice and style.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Upload Documents</Label>
                        <div className="flex items-center justify-center w-full">
                            <Label htmlFor="brand-doc-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                    {fileName ? (
                                        <p className="font-semibold text-sm text-primary">{fileName}</p>
                                    ) : (
                                        <>
                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT (up to 5MB)</p>
                                        </>
                                    )}
                                </div>
                                <Input id="brand-doc-upload" type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
                            </Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit">Upload & Train</Button>
                </CardFooter>
            </form>
        </Card>
    );
}
