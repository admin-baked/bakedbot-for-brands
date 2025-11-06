
'use client';

import { type Theme } from '@/lib/themes';
import { createStore, useStore as useZustandStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createContext, useContext, useRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof import('lucide-react');
  hidden?: boolean;
};

export type Location = {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    email?: string;
    lat?: number;
    lon?: number;
};

export interface StoreState {
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
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

const defaultNavLinks: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', hidden: false },
    { href: '/menu', label: 'Menu', icon: 'MenuSquare', hidden: false },
    { href: '/dashboard/orders', label: 'Orders', icon: 'Package', hidden: false },
    { href: '/dashboard/content', label: 'Content Generator', icon: 'PenSquare', hidden: false },
    { href: '/dashboard/reviews', label: 'Reviews', icon: 'Star', hidden: false },
    { href: '/dashboard/locations', label: 'Locations', icon: 'MapPin', hidden: false },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings', hidden: false },
];

const getDefaultInitialState = () => ({
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
  _hasHydrated: false,
});


const zustandContext = createContext<ReturnType<typeof initializeStore> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const storeRef = useRef<ReturnType<typeof initializeStore>>();
    if (!storeRef.current) {
        storeRef.current = initializeStore();
    }
    return (
        <zustandContext.Provider value={storeRef.current}>
            {children}
        </zustandContext.Provider>
    );
}

export function useStore<T>(selector: (state: StoreState) => T) {
    const store = useContext(zustandContext);
    if (!store) throw new Error('useStore must be used within a StoreProvider');
    return useZustandStore(store, selector);
}

const initializeStore = () => {
    return createStore<StoreState>()(
        persist(
            (set, get) => ({
                ...getDefaultInitialState(),
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
                setHasHydrated: (hydrated: boolean) => set({ _hasHydrated: hydrated }),
            }),
            {
                name: 'smokey-store',
                storage: createJSONStorage(() => localStorage),
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
};
