
'use client';

import * as React from 'react';
import { type Theme } from '@/lib/themes';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { LayoutDashboard, PenSquare, Settings, Star, Package, type LucideIcon, MapPin, MenuSquare } from 'lucide-react';
import { ComponentType } from 'react';

// Define the type for a navigation link
export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof import('lucide-react'); // Store icon name as a string
  hidden?: boolean;
};

// Define the type for a location
export type Location = {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
};

interface StoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  chatbotIcon: string | null;
  setChatbotIcon: (icon: string | null) => void;
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
  toggleCeoMode: () => void;
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  navLinks: NavLink[];
  addNavLink: (link: NavLink) => void;
  updateNavLink: (href: string, newLink: Partial<NavLink>) => void;
  toggleNavLinkVisibility: (href: string) => void;
  removeNavLink: (href: string) => void;
  locations: Location[];
  addLocation: (location: Location) => void;
  updateLocation: (id: string, newLocation: Partial<Location>) => void;
  removeLocation: (id: string) => void;
}

const defaultNavLinks: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', hidden: false },
    { href: '/dashboard/menu', label: 'Menu', icon: 'MenuSquare', hidden: false },
    { href: '/dashboard/products', label: 'Products', icon: 'Package', hidden: false },
    { href: '/dashboard/content', label: 'Content Generator', icon: 'PenSquare', hidden: false },
    { href: '/dashboard/reviews', label: 'Reviews', icon: 'Star', hidden: false },
    { href: '/dashboard/locations', label: 'Locations', icon: 'MapPin', hidden: false },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings', hidden: false },
];


const defaultState: Omit<StoreState, 'setTheme' | 'setChatbotIcon' | 'setChatExperience' | 'recordBrandImageGeneration' | 'setBrandColor' | 'setBrandUrl' | 'setBasePrompt' | 'setWelcomeMessage' | 'toggleCeoMode' | 'toggleDemoMode' | 'addNavLink' | 'updateNavLink' | 'toggleNavLinkVisibility' | 'removeNavLink' | 'addLocation' | 'updateLocation' | 'removeLocation'> = {
  theme: 'green' as Theme,
  chatbotIcon: null,
  chatExperience: 'default' as 'default' | 'classic',
  brandImageGenerations: 0,
  lastBrandImageGeneration: null,
  brandColor: '',
  brandUrl: '',
  basePrompt: "You are Smokey, a friendly and knowledgeable AI budtender. Your goal is to help users discover the best cannabis products for them. Keep your tone light, informative, and a little playful.",
  welcomeMessage: "Hello! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!",
  isCeoMode: false,
  isDemoMode: false,
  navLinks: defaultNavLinks,
  locations: [],
};


const createStore = () => create<StoreState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setTheme: (theme: Theme) => set({ theme }),
      setChatbotIcon: (icon: string | null) => set({ chatbotIcon: icon }),
      setChatExperience: (experience: 'default' | 'classic') => set({ chatExperience: experience }),
      setBrandColor: (color: string) => set({ brandColor: color }),
      setBrandUrl: (url: string) => set({ brandUrl: url }),
      setBasePrompt: (prompt: string) => set({ basePrompt: prompt }),
      setWelcomeMessage: (message: string) => set({ welcomeMessage: message }),
      toggleCeoMode: () => set((state) => ({ isCeoMode: !state.isCeoMode })),
      toggleDemoMode: () => set((state) => ({ isDemoMode: !state.isDemoMode })),
      recordBrandImageGeneration: () => {
        const { lastBrandImageGeneration, brandImageGenerations } = get();
        const now = Date.now();
        const today = new Date(now).toDateString();
        const lastDate = lastBrandImageGeneration ? new Date(lastBrandImageGeneration).toDateString() : null;

        if (today === lastDate) {
          set({ brandImageGenerations: brandImageGenerations + 1, lastBrandImageGeneration: now });
        } else {
          // It's a new day, reset the count
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
      addLocation: (location: Location) => set((state) => ({ locations: [...state.locations, location] })),
      updateLocation: (id: string, newLocation: Partial<Location>) => set((state) => ({
          locations: state.locations.map((loc) => loc.id === id ? { ...loc, ...newLocation } : loc)
      })),
      removeLocation: (id: string) => set(state => ({ locations: state.locations.filter(l => l.id !== id) })),
    }),
    {
      name: 'smokey-store',
      storage: createJSONStorage(() => localStorage),
      // A patch to handle the fact that icon components are not serializable
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (error) {
            console.error("An error happened during rehydration", error);
          }
          if (state) {
            // If navLinks are missing from storage, use default
            if (!state.navLinks || state.navLinks.length === 0) {
              state.navLinks = defaultNavLinks;
            }
          }
        };
      },
    }
  )
);

type Store = ReturnType<typeof createStore>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<Store>();
  if (!storeRef.current) {
    storeRef.current = createStore();
  }
  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  );
}

// A new type that includes all state and all setters
type FullStoreState = StoreState & {
    setTheme: (theme: Theme) => void;
    setChatbotIcon: (icon: string | null) => void;
    setChatExperience: (experience: 'default' | 'classic') => void;
    recordBrandImageGeneration: () => void;
    setBrandColor: (color: string) => void;
    setBrandUrl: (url: string) => void;
    setBasePrompt: (prompt: string) => void;
    setWelcomeMessage: (message: string) => void;
    toggleCeoMode: () => void;
    toggleDemoMode: () => void;
    addNavLink: (link: NavLink) => void;
    updateNavLink: (href: string, newLink: Partial<NavLink>) => void;
    toggleNavLinkVisibility: (href: string) => void;
    removeNavLink: (href: string) => void;
    addLocation: (location: Location) => void;
    updateLocation: (id: string, newLocation: Partial<Location>) => void;
    removeLocation: (id: string) => void;
};


export function useStore(): FullStoreState {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider.');
  }
  
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const state = store();
  
  const hydratedState = {
    ...state,
    navLinks: state.navLinks && state.navLinks.length > 0 ? state.navLinks : defaultNavLinks
  };

  const defaultSetters = {
    setTheme: (theme: Theme) => {},
    setChatbotIcon: (icon: string | null) => {},
    setChatExperience: (experience: 'default' | 'classic') => {},
    recordBrandImageGeneration: () => {},
    setBrandColor: (color: string) => {},
    setBrandUrl: (color: string) => {},
    setBasePrompt: (prompt: string) => {},
    setWelcomeMessage: (message: string) => {},
    toggleCeoMode: () => {},
    toggleDemoMode: () => {},
    addNavLink: (link: NavLink) => {},
    updateNavLink: (href: string, newLink: Partial<NavLink>) => {},
    toggleNavLinkVisibility: () => {},
    removeNavLink: (href: string) => {},
    addLocation: (location: Location) => {},
    updateLocation: (id: string, newLocation: Partial<Location>) => {},
    removeLocation: (id: string) => {},
  }

  const combinedState: FullStoreState = {
    ...state,
    ...(hydrated ? hydratedState : defaultState),
  };

  return hydrated ? combinedState : { ...defaultState, ...defaultSetters, isCeoMode: state.isCeoMode, toggleCeoMode: state.toggleCeoMode, isDemoMode: state.isDemoMode, toggleDemoMode: state.toggleDemoMode };
}
