'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Image as ImageIcon, Link, Palette, Upload } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import * as React from "react";

export default function BrandSettings() {
    const { chatbotIcon, setChatbotIcon, brandColor, setBrandColor, brandUrl, setBrandUrl } = useStore();
    const { toast } = useToast();
    
    // Local state for the image preview
    const [iconPreview, setIconPreview] = React.useState<string | null>(chatbotIcon);

    const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setIconPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (iconPreview) {
            setChatbotIcon(iconPreview);
        }

        toast({
            title: "Branding Saved!",
            description: "Your branding settings have been updated.",
        });
    }

    React.useEffect(() => {
        setIconPreview(chatbotIcon);
    }, [chatbotIcon]);

    return (
        <Card>
            <form onSubmit={handleSave}>
                <CardHeader>
                    <CardTitle>AI Branding Agent</CardTitle>
                    <CardDescription>
                        Match your brand perfectly by providing a color, a website for our AI to crawl, or by uploading a custom widget icon.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="hex-code">Brand Color</Label>
                        <div className="relative">
                            <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="hex-code" placeholder="#FFFFFF" className="pl-8" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="brand-url">Brand URL</Label>
                        <div className="relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="brand-url" placeholder="https://your-brand.com" className="pl-8" value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Custom Widget Icon</Label>
                        <div className="flex items-center gap-4">
                            <div className="relative h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                                {iconPreview ? (
                                    <Image src={iconPreview} alt="Custom Icon" layout="fill" className="rounded-full object-cover" />
                                ) : (
                                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                )}
                            </div>
                             <Label htmlFor="icon-upload" className="flex-1 cursor-pointer">
                                <Button type="button" as="span" variant="outline">
                                    <Upload className="mr-2" />
                                    Upload Icon
                                </Button>
                                <Input id="icon-upload" type="file" className="hidden" accept="image/*" onChange={handleIconUpload} />
                            </Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit">Save Branding</Button>
                </CardFooter>
            </form>
        </Card>
    );
}
