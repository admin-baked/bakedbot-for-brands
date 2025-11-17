
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
    { href: '/dashboard/reviews', label: 'Reviews', icon: 'Star', hidden: false },
    { href: '/dashboard/locations', label: 'Retailers', icon: 'MapPin', hidden: false },
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
  
  // Settings
  brandImageGenerations: number;
  lastBrandImageGeneration: number | null;
  brandColor: string;
  brandUrl: string;
  basePrompt: string;
  welcomeMessage: string;
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
  recordBrandImageGeneration: () => void;
  setBrandColor: (color: string) => void;
  setBrandUrl: (url: string) => void;
  setBasePrompt: (prompt: string) => void;
  setWelcomeMessage: (message: string) => void;
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
      
      // Settings
      brandImageGenerations: 0,
      lastBrandImageGeneration: null,
      brandColor: '',
      brandUrl: '',
      basePrompt: "You are Smokey, a friendly and knowledgeable AI budtender. Your goal is to help users discover the best cannabis products for them. Keep your tone light, informative, and a little playful.",
      welcomeMessage: "Hello! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!",
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
      setBrandColor: (color: string) => set({ brandColor: color }),
      setBrandUrl: (url: string) => set({ brandUrl: url }),
      setBasePrompt: (prompt: string) => set({ basePrompt: prompt }),
      setWelcomeMessage: (message: string) => set({ welcomeMessage: message }),
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
      // Use partialize to select which parts of the state to persist.
      // We are excluding `navLinks` and `isCeoMode`.
      partialize: (state) => ({
        theme: state.theme,
        menuStyle: state.menuStyle,
        favoriteRetailerId: state.favoriteRetailerId,
        favoriteLocationId: state.favoriteLocationId,
        chatExperience: state.chatExperience,
        brandImageGenerations: state.brandImageGenerations,
        lastBrandImageGeneration: state.lastBrandImageGeneration,
        brandColor: state.brandColor,
        brandUrl: state.brandUrl,
        basePrompt: state.basePrompt,
        welcomeMessage: state.welcomeMessage,
        emailProvider: state.emailProvider,
        sendgridApiKey: state.sendgridApiKey,
      }),
    }
  )
);
