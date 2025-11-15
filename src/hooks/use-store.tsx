
'use client';

import { type Theme } from '@/lib/themes';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as LucideIcons from 'lucide-react';
import type { Location } from '@/firebase/converters';


export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof LucideIcons;
  hidden?: boolean;
};

export interface StoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  menuStyle: 'default' | 'alt';
  setMenuStyle: (style: 'default' | 'alt') => void;
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string | null) => void;
  favoriteLocationId: string | null;
  setFavoriteLocationId: (id: string | null) => void;
  isCartSheetOpen: boolean;
  setCartSheetOpen: (isOpen: boolean) => void;
  chatExperience: 'default' | 'classic';
  setChatExperience: (experience: 'default' | 'classic') => void;
  brandImageGenerations: number;
  lastBrandImageGeneration: number | null;
  recordBrandImageGeneration: () => void;
  brandColor: string;
  setBrandColor: (color: string) => void;
  brandUrl: string;
  setBrandUrl: (url: string) => void;
  basePrompt: string;
  setBasePrompt: (prompt: string) => void;
  welcomeMessage: string;
  setWelcomeMessage: (message: string) => void;
  isCeoMode: boolean;
  setIsCeoMode: (isCeo: boolean) => void;
  emailProvider: 'sendgrid' | 'gmail';
  setEmailProvider: (provider: 'sendgrid' | 'gmail') => void;
  sendgridApiKey: string | null;
  setSendgridApiKey: (key: string | null) => void;
  navLinks: NavLink[];
  addNavLink: (link: NavLink) => void;
  updateNavLink: (href: string, newLink: Partial<NavLink>) => void;
  toggleNavLinkVisibility: (href: string) => void;
  removeNavLink: (href: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

const defaultNavLinks: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', hidden: false },
    { href: '/dashboard/orders', label: 'Orders', icon: 'Package', hidden: false },
    { href: '/dashboard/products', label: 'Products', icon: 'Box', hidden: false },
    { href: '/dashboard/content', label: 'Content AI', icon: 'PenSquare', hidden: false },
    { href: '/dashboard/reviews', label: 'Reviews', icon: 'Star', hidden: false },
    { href: '/dashboard/locations', label: 'Locations', icon: 'MapPin', hidden: false },
    { href: '/dashboard/settings#data', label: 'Catalog', icon: 'BookMarked', hidden: false },
    { href: '/checkout', label: 'Checkout', icon: 'CreditCard', hidden: true },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings', hidden: false },
];


export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      theme: 'green' as Theme,
      menuStyle: 'default' as 'default' | 'alt',
      selectedLocationId: null,
      favoriteLocationId: null,
      isCartSheetOpen: false,
      chatExperience: 'default' as 'default' | 'classic',
      brandImageGenerations: 0,
      lastBrandImageGeneration: null,
      brandColor: '',
      brandUrl: '',
      basePrompt: "You are Smokey, a friendly and knowledgeable AI budtender. Your goal is to help users discover the best cannabis products for them. Keep your tone light, informative, and a little playful.",
      welcomeMessage: "Hello! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!",
      isCeoMode: false,
      emailProvider: 'sendgrid' as 'sendgrid' | 'gmail',
      sendgridApiKey: null,
      navLinks: defaultNavLinks,
      _hasHydrated: false,
      setTheme: (theme: Theme) => set({ theme }),
      setMenuStyle: (style: 'default' | 'alt') => set({ menuStyle: style }),
      setSelectedLocationId: (id: string | null) => set({ selectedLocationId: id }),
      setFavoriteLocationId: (id: string | null) => set({ favoriteLocationId: id }),
      setCartSheetOpen: (isOpen: boolean) => set({ isCartSheetOpen: isOpen }),
      setChatExperience: (experience: 'default' | 'classic') => set({ chatExperience: experience }),
      setBrandColor: (color: string) => set({ brandColor: color }),
      setBrandUrl: (url: string) => set({ brandUrl: url }),
      setBasePrompt: (prompt: string) => set({ basePrompt: prompt }),
      setWelcomeMessage: (message: string) => set({ welcomeMessage: message }),
      setIsCeoMode: (isCeo: boolean) => set({ isCeoMode: isCeo }),
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
      addNavLink: (link: NavLink) => set((state) => ({ navLinks: [...state.navLinks, { ...link, hidden: false }] })),
      updateNavLink: (href: string, newLink: Partial<NavLink>) => set((state) => ({
          navLinks: state.navLinks.map((link) => link.href === href ? { ...link, ...newLink } : link)
      })),
      toggleNavLinkVisibility: (href: string) => set((state) => ({
          navLinks: state.navLinks.map((link) => link.href === href ? { ...link, hidden: !link.hidden } : link)
      })),
      removeNavLink: (href: string) => set(state => ({ navLinks: state.navLinks.filter(l => l.href !== href) })),
      setHasHydrated: (hydrated: boolean) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'bakedbot-storage', // Keep a separate name for local storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
            if (!state.navLinks || state.navLinks.length === 0) {
              state.navLinks = defaultNavLinks;
          }
        }
      },
    }
  )
);
