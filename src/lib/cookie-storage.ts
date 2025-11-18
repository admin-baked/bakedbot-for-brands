'use client';

import { type Theme } from '@/lib/themes';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Retailer, Product } from '@/firebase/converters';

export type CartItem = Product & { quantity: number };

export interface CookieStoreState {
  _hasHydrated: boolean;
  
  // App/UI State
  theme: Theme;
  menuStyle: 'default' | 'alt';
  favoriteRetailerId: string | null;
  chatExperience: 'default' | 'classic';
  isDemo: boolean;
  
  // Settings - These will be migrated to Firestore
  brandImageGenerations: number;
  lastBrandImageGeneration: number | null;
  brandColor: string;
  brandUrl: string;
  isCeoMode: boolean; // Not persisted
  emailProvider: 'sendgrid' | 'gmail';
  sendgridApiKey: string | null;

  // Actions
  setTheme: (theme: Theme) => void;
  setMenuStyle: (style: 'default' | 'alt') => void;
  setFavoriteRetailerId: (id: string | null) => void;
  setChatExperience: (experience: 'default' | 'classic') => void;
  setIsDemo: (isDemo: boolean) => void;
  recordBrandImageGeneration: () => void;
  setBrandColor: (color: string) => void;
  setBrandUrl: (url: string) => void;
  setIsCeoMode: (isCeo: boolean) => void;
  setEmailProvider: (provider: 'sendgrid' | 'gmail') => void;
  setSendgridApiKey: (key: string | null) => void;
}


export const useCookieStore = create<CookieStoreState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      
      // App/UI State
      theme: 'green' as Theme,
      menuStyle: 'default' as 'default' | 'alt',
      favoriteRetailerId: null,
      chatExperience: 'default' as 'classic',
      isDemo: true,
      
      // Settings
      brandImageGenerations: 0,
      lastBrandImageGeneration: null,
      brandColor: '',
      brandUrl: '',
      isCeoMode: false,
      emailProvider: 'sendgrid' as 'sendgrid' | 'gmail',
      sendgridApiKey: null,
      
      // Actions
      setTheme: (theme: Theme) => set({ theme }),
      setMenuStyle: (style: 'default' | 'alt') => set({ menuStyle: style }),
      setFavoriteRetailerId: (id: string | null) => set({ favoriteRetailerId: id }),
      setChatExperience: (experience: 'default' | 'classic') => set({ chatExperience: experience }),
      setIsDemo: (isDemo: boolean) => set({ isDemo }),
      setBrandColor: (color: string) => set({ brandColor: color }),
      setBrandUrl: (url: string) => set({ brandUrl: url }),
      setIsCeoMode: (isCeo: boolean) => set({ isCeoMode: isCeo }), // Action to set non-persisted state
      setEmailProvider: (provider) => set({ emailProvider: provider }),
      setSendgridApiKey: (key) => set({ sendgridApiKey: key }),
      recordBrandImageGeneration: () => {
          const { lastBrandImageGeneration, brandImageGenerations } = get();
          const now = Date.now();
          const today = new Date(now).toDateString();
          const lastDate = lastBrandImageGeneration ? new Date(lastBrandImageGeneration).toDateString() : null;

          if (today === lastDate) {
              set({ brandImageGenerations: brandImageGenerations + 1, lastBrandImageGeneration: now });
          } else {
              set({ brandImageGenerations: 1, lastBrandImageGeneration: now });
          }
      },
    }),
    {
      name: 'bakedbot-storage', 
      storage: createJSONStorage(() => localStorage), 
      onRehydrateStorage: () => (state) => {
        if (state) {
            state._hasHydrated = true;
        }
      },
      // We only persist UI preferences, not sensitive or brand-specific settings.
      partialize: (state) => ({
        theme: state.theme,
        menuStyle: state.menuStyle,
        favoriteRetailerId: state.favoriteRetailerId,
        chatExperience: state.chatExperience,
        isDemo: state.isDemo,
        brandImageGenerations: state.brandImageGenerations,
        lastBrandImageGeneration: state.lastBrandImageGeneration,
      }),
    }
  )
);
