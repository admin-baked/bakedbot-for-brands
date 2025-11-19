
'use client';

import { useFormState } from 'react-dom';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateBrandSettings, type BrandSettingsFormState } from '../actions';
import { type Brand } from '@/types/domain';
import { SubmitButton } from './submit-button';
import { useStore } from '@/hooks/use-store';
import { themes } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Box, LayoutGrid } from 'lucide-react';

const initialState: BrandSettingsFormState = {
  message: '',
  error: false,
};

interface BrandSettingsFormProps {
    brand: Brand;
}

export default function BrandSettingsForm({ brand }: BrandSettingsFormProps) {
  const [state, formAction] = useFormState(updateBrandSettings, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { theme, setTheme, menuStyle, setMenuStyle } = useStore();

  useEffect(() => {
    if (state.message) {
      if (state.error && !state.fieldErrors) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
      } else if (!state.error) {
         toast({ title: 'Success!', description: state.message });
      }
    }
  }, [state, toast]);

  return (
    <Card>
      <form ref={formRef} action={formAction}>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>Update your brand's name, logo, and theme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input id="brandName" name="brandName" defaultValue={brand.name} />
            {state.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" name="logoUrl" defaultValue={brand.logoUrl || ''} placeholder="https://example.com/logo.png"/>
             {state.fieldErrors?.logoUrl && <p className="text-sm text-destructive">{state.fieldErrors.logoUrl[0]}</p>}
          </div>
          
          <Separator />

          <div className="space-y-3">
             <Label>Menu Layout</Label>
             <RadioGroup value={menuStyle} onValueChange={(value) => setMenuStyle(value as 'default' | 'alt')} className="grid grid-cols-2 gap-4">
                <div>
                    <RadioGroupItem value="default" id="style-default" className="peer sr-only" />
                    <Label htmlFor="style-default" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <LayoutGrid className="mb-3 h-6 w-6" />
                        Standard Grid
                    </Label>
                </div>
                 <div>
                    <RadioGroupItem value="alt" id="style-alt" className="peer sr-only" />
                     <Label htmlFor="style-alt" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Box className="mb-3 h-6 w-6" />
                        Tiled by Category
                    </Label>
                </div>
             </RadioGroup>
          </div>

          <Separator />
          <div className="space-y-3">
             <Label>Theme</Label>
             <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => (
                    <Button
                        key={t.name}
                        variant="outline"
                        type="button"
                        onClick={() => setTheme(t.name)}
                        className={cn("justify-start", theme === t.name && "border-primary ring-2 ring-primary")}
                    >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `hsl(${t.cssVars.light.primary})` }}>
                         {theme === t.name && <Check className="h-4 w-4 text-white" />}
                        </span>
                        <span className="ml-3 capitalize">{t.name}</span>
                    </Button>
                ))}
             </div>
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
