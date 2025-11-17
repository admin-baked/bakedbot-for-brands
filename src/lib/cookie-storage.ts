
'use client';

import { type Theme } from '@/lib/themes';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as LucideIcons from 'lucide-react';
import type { Retailer, Product } from '@/firebase/converters';

export type CartItem = Product & { quantity: number };

export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof LucideIcons;
  hidden?: boolean;
};

// Moved outside the store definition to be a true constant.
const defaultNavLinks: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', hidden: false },
    { href: '/dashboard/orders', label: 'Orders', icon: 'Package', hidden: false },
    { href: '/dashboard/products', label: 'Products', icon: 'Box', hidden: false },
    { href: '/dashboard/content', label: 'Content AI', icon: 'PenSquare', hidden: false },
    { href: '/dashboard/reviews', label: 'Reviews', icon: 'Star', hidden: true },
    { href: '/dashboard/locations', label: 'Retailers', icon: 'MapPin', hidden: true },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings', hidden: false },
    { href: '/dashboard/ceo/import-demo-data', label: 'Data Manager', icon: 'Database', hidden: true },
    { href: '/dashboard/ceo/initialize-embeddings', label: 'AI Search Index', icon: 'BrainCircuit', hidden: true },
];

export interface CookieStoreState {
  _hasHydrated: boolean;
  
  // App/UI State
  theme: Theme;
  menuStyle: 'default' | 'alt';
  favoriteRetailerId: string | null;
  favoriteLocationId: string | null;
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
  navLinks: NavLink[]; // Not persisted

  // Actions
  setTheme: (theme: Theme) => void;
  setMenuStyle: (style: 'default' | 'alt') => void;
  setFavoriteRetailerId: (id: string | null) => void;
  setFavoriteLocationId: (id: string | null) => void;
  setChatExperience: (experience: 'default' | 'classic') => void;
  setIsDemo: (isDemo: boolean) => void;
  recordBrandImageGeneration: () => void;
  setBrandColor: (color: string) => void;
  setBrandUrl: (url: string) => void;
  setIsCeoMode: (isCeo: boolean) => void;
  setEmailProvider: (provider: 'sendgrid' | 'gmail') => void;
  setSendgridApiKey: (key: string | null) => void;
  addNavLink: (link: NavLink) => void;
  updateNavLink: (href: string, newLink: Partial<NavLink>) => void;
  toggleNavLinkVisibility: (href: string) => void;
  removeNavLink: (href: string) => void;
}


export const useCookieStore = create<CookieStoreState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      
      // App/UI State
      theme: 'green' as Theme,
      menuStyle: 'default' as 'default' | 'alt',
      favoriteRetailerId: null,
      favoriteLocationId: null,
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
      navLinks: defaultNavLinks, // Initialized but not persisted.
      
      // Actions
      setTheme: (theme: Theme) => set({ theme }),
      setMenuStyle: (style: 'default' | 'alt') => set({ menuStyle: style }),
      setFavoriteRetailerId: (id: string | null) => set({ favoriteRetailerId: id, favoriteLocationId: id }),
      setFavoriteLocationId: (id: string | null) => set({ favoriteRetailerId: id, favoriteLocationId: id }),
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
      // Actions to modify non-persisted navLinks state
      addNavLink: (link: NavLink) => set((state) => ({ navLinks: [...state.navLinks, { ...link, hidden: false }] })),
      updateNavLink: (href: string, newLink: Partial<NavLink>) => set((state) => ({
          navLinks: state.navLinks.map((link) => link.href === href ? { ...link, ...newLink } : link)
      })),
      toggleNavLinkVisibility: (href: string) => set((state) => ({
          navLinks: state.navLinks.map((link) => link.href === href ? { ...link, hidden: !link.hidden } : link)
      })),
      removeNavLink: (href: string) => set(state => ({ navLinks: state.navLinks.filter(l => l.href !== href) })),
      
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
        favoriteLocationId: state.favoriteLocationId,
        chatExperience: state.chatExperience,
        isDemo: state.isDemo,
        brandImageGenerations: state.brandImageGenerations,
        lastBrandImageGeneration: state.lastBrandImageGeneration,
      }),
    }
  )
);
