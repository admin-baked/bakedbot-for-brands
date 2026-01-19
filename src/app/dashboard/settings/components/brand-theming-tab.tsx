'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { Loader2, Palette, Image as ImageIcon, Check, Upload } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/client-config';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  heroImageUrl?: string;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#16a34a',
  secondaryColor: '#065f46',
  logoUrl: '',
  heroImageUrl: '',
};

export default function BrandThemingTab() {
  const { brandId, role } = useUserRole();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Determine collection based on role
  const collection = role === 'dispensary' ? 'organizations' : 'brands';

  useEffect(() => {
    async function loadTheme() {
      if (!brandId) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, collection, brandId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTheme({
            primaryColor: data.theme?.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: data.theme?.secondaryColor || DEFAULT_THEME.secondaryColor,
            logoUrl: data.logoUrl || '',
            heroImageUrl: data.theme?.heroImageUrl || '',
          });
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTheme();
  }, [brandId, collection]);

  async function uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async function handleSave() {
    if (!brandId) return;

    setSaving(true);

    try {
      let logoUrl = theme.logoUrl;
      let heroImageUrl = theme.heroImageUrl;

      // Upload logo if changed
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, `brands/${brandId}/logo-${Date.now()}`);
      }

      // Upload hero image if changed
      if (heroFile) {
        heroImageUrl = await uploadFile(heroFile, `brands/${brandId}/hero-${Date.now()}`);
      }

      // Update Firestore
      const docRef = doc(db, collection, brandId);
      await updateDoc(docRef, {
        logoUrl,
        theme: {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          heroImageUrl,
        },
      });

      setTheme((prev) => ({ ...prev, logoUrl, heroImageUrl }));
      setLogoFile(null);
      setHeroFile(null);

      toast({
        title: 'Theme Saved',
        description: 'Your brand theming has been updated successfully.',
      });
    } catch (error) {
      console.error('Failed to save theme:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your theme. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Brand Theming</CardTitle>
        </div>
        <CardDescription>
          Customize how your menu looks to customers. These colors and images will appear on your public menu page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Logo
          </Label>
          <div className="flex items-center gap-4">
            {(theme.logoUrl || logoFile) && (
              <div className="h-16 w-16 rounded-lg border bg-muted overflow-hidden">
                <img
                  src={logoFile ? URL.createObjectURL(logoFile) : theme.logoUrl}
                  alt="Logo preview"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="max-w-xs"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended: Square image, at least 200x200px, PNG or JPG.
          </p>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="primaryColor"
                type="color"
                value={theme.primaryColor}
                onChange={(e) => setTheme((t) => ({ ...t, primaryColor: e.target.value }))}
                className="w-14 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => setTheme((t) => ({ ...t, primaryColor: e.target.value }))}
                className="flex-1 font-mono uppercase"
                placeholder="#16a34a"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for buttons, links, and accents.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="secondaryColor"
                type="color"
                value={theme.secondaryColor}
                onChange={(e) => setTheme((t) => ({ ...t, secondaryColor: e.target.value }))}
                className="w-14 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={theme.secondaryColor}
                onChange={(e) => setTheme((t) => ({ ...t, secondaryColor: e.target.value }))}
                className="flex-1 font-mono uppercase"
                placeholder="#065f46"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for hover states and backgrounds.
            </p>
          </div>
        </div>

        {/* Hero Image Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Hero Image (Optional)
          </Label>
          <div className="space-y-3">
            {(theme.heroImageUrl || heroFile) && (
              <div className="h-32 w-full max-w-md rounded-lg border bg-muted overflow-hidden">
                <img
                  src={heroFile ? URL.createObjectURL(heroFile) : theme.heroImageUrl}
                  alt="Hero preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
              className="max-w-xs"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended: Wide banner image, at least 1200x400px.
          </p>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <p className="text-sm font-medium mb-3">Preview</p>
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt="Logo" className="h-full w-full object-contain rounded-lg" />
              ) : (
                'B'
              )}
            </div>
            <div>
              <button
                className="px-4 py-2 rounded-md text-white font-medium text-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Add to Cart
              </button>
              <button
                className="ml-2 px-4 py-2 rounded-md font-medium text-sm border"
                style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
              >
                View Details
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Theme
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
