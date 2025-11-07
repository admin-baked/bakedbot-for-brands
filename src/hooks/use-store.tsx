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
  menuStyle: 'default' | 'alt';
  setMenuStyle: (style: 'default' | 'alt') => void;
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
  menuStyle: 'default' as 'default' | 'alt',
  chatbotIcon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAclBMVEUAdL3///8Acb0Ab7wAbLwAarwAcrz7/v7+/v4AcLzu+PoAe78AeL7O8PDe9/gAfr8AgcAAd77L7/jE7ffB6/b3+/0AgMBpudcAhcMph8I2jMLy+vxOsNFZtNUpicHX9PjW8/dgr9g6kMM9lcQwhsI4jsNMuNJzveB4pXyTAAACyElEQVR4nO3d65KiMBQFYImkGkVFBRVzKCjO+7/OQ5oEBoZLe2/Od/ZOzPVE2mapj1hREREhO5Nq5dJ3r9H6nS6ve3t7d3L5Y7m9/tS6Z5+L3eX3t6e3N7e+nbe5/1y/X4/nU73d2+l3+83m82+lK53Op0mDMP3S/fe7/c2m81u13f8A5qLxuPx+v1+e3t722w229vbW/M8/6tE4vF4PBqNvu/7+Xy+3+/t9/vL+fn5fr9/57f6/f55nv9f8zz/0Xg8Hs/z/H6/3+v1+nU63d7e3ra5uXmbzVatVqvVajwe/+7+vF6v1+t1u91ub29vb29/eHh4eHh4sVgsFovl+/4/z/Pj8Xg0Go/H43mef5/P93q9vu/7fr//zv+k3+/3+/1+u90+z/Pj8Xg0Hs/z/H6/3+v1HMfx+/1+uVz2+/08z/PxeDwev99vNpv9Wt/3vV5vNpv1+/3zPM/z/H89z/Pj8Xi8Xq/v+97v95vNZrPZ/J/3/fl8vtvtHsfxtnvebre73W6/3+92u13X9Xq9Xq/H4/H7/X6/3zRNM5lMRqNRq9UcDsfj8Xg8nq7rNE3zb3p7e3t7e/uV0+/3S/oXm82yWCxWq/V+v+/7/n6//85/0+/3z/P8v16v1+v1bre73W5vb28/3u/3S+d7Pp/2+/08z//r+/77/f7L5bLb7W7XNdM0zmaz2Ww2nU4nEonNZvPjfr9vNps8z1uWZcuyzGaz2+1Wq9X7/X61Wq3X6x3H8Xg8vu/7/f7+W2l7e3s6nW63283n836/v91uZ57nPM88z/P5fH9/f+d/1e/39/f3z/P8er32fd/3fX8/n6/X6/f7/f5+fn6+3+/f+a/0+/3zPM/z/H+d5/nxeLxeL/v9vr7vf728vDyfz/f7/Xme5/n5+fnd/u73+3me5/l/ned5Pp+uruv7vs/z/Pj4uP/29va1nuf5eDz+4v+XpmmWZZlpmmEYzGaz2Ww+n0+n02EYhqbp5/b39/e3t7ffNjc35/P55+fn59vt9nQ6/dy+5fn5+eXl5e3t7eXl5e7ubtM0m83mfr//2r/3+/08z//+e/0+nw/DMJ/PZ5qmdrvdrus4jjzP9/v9ZFn+2n+w2+3z+fzxeDzLsvP5fDwej8fj8ffv32+1Wq/X63a7/bX/+fb2ts/nbzabmabp+/7xeDwev99vNpv9Wt/3vV5vNpv1+/3zPM/z/H89z/Pj8Xi8Xq/v+97v95vNZrPZ/J/3/fl8vtvtHsfxtnvebre73W6/3+92u13X9Xq9Xq/H4/H7/X6/3zRNM5lMRqNRq9UcDsfj8Xg8nq7rNE3zb3p7e3t7e/uV0+/3S/oXm82yWCxWq/V+v+/7/n6//85/0+/3z/P8v16v1+v1bre73W5vb28/3u/3S+d7Pp/2+/08z//r+/77/f7L5bLb7W7XNdM0zmaz2Ww2nU4nEonNZvPjfr9vNps8z1uWZcuyzGaz2+1Wq9X7/X61Wq3X6x3H8Xg8vu/7/f7+W2l7e3s6nW63283n836/v91uZ57nPM88z/P5fH9/f+d/1e/39/f3z/P8er32fd/3fX8/n6/X6/f7/f5+fn6+3+/f+a/0+/3zPM/z/H+d5/nxeLxeL/v9vr7vf728vDyfz/f7/Xme5/n5+fnd/u73+3me5/l/ned5Pp+uruv7vs/z/Pj4uP/29va1nuf5eDz+4v+XpmmWZZlpmmEYzGaz2Ww+n0+n02EYhqbp5/b39/e3t7ffNjc35/P55+fn59vt9nQ6/dy+5fn5+eXl5e3t7eXl5e7ubtM0m83mfr//2r/3+/08z//+e/0+nw/DMJ/PZ5qmdrvdrus4jjzP9/v9ZFn+2n+w2+3z+fzxeDzLsvP5fDwej8fj8ffv32+1Wq/X63a7/bX/+fb2ts/nbzabmabp+/7xeDweD0aj0Wiapt/evlgs5nkehuHxePz69ev1en1/f3+1Wn348OHp6enBweHFixdPT0+vXr26urq6vr7+9u1bFEVRlEql0ujo6OhobGysrq6+f//+0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0d-EHUNoW2W+d4uAAAAAElFTkSuQmCC",
  chatExperience: 'default' as 'default' | 'classic',
  brandImageGenerations: 0,
  lastBrandImageGeneration: null,
  brandColor: '',
  brandUrl: '',
  basePrompt: "You are Smokey, a friendly and knowledgeable AI budtender. Your goal is to help users discover the best cannabis products for them. Keep your tone light, informative, and a little playful.",
  welcomeMessage: "Hello! I'm Smokey, your AI budtender. Browse our products above and ask me anything about them!",
  isCeoMode: false,
  navLinks: [],
  locations: [],
  _hasHydrated: false,
});

const createHydratableStore = (initialState: StoreState) => {
    return createStore<StoreState>()(
        persist(
            (set, get) => ({
                ...initialState,
                setTheme: (theme: Theme) => set({ theme }),
                setMenuStyle: (style: 'default' | 'alt') => set({ menuStyle: style }),
                setChatbotIcon: (icon: string | null) => set({ chatbotIcon: icon }),
                setChatExperience: (experience: 'default' | 'classic') => set({ chatExperience: experience }),
                setBrandColor: (color: string) => set({ brandColor: color }),
                setBrandUrl: (url: string) => set({ brandUrl: url }),
                setBasePrompt: (prompt: string) => set({ basePrompt: prompt }),
                setWelcomeMessage: (message: string) => set({ welcomeMessage: message }),
                toggleCeoMode: () => set((state) => ({ isCeoMode: !state.isCeoMode })),
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

type AppStore = ReturnType<typeof createHydratableStore>;
const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const storeRef = useRef<AppStore>();
    if (!storeRef.current) {
        storeRef.current = createHydratableStore(getDefaultInitialState());
    }
    return (
        <StoreContext.Provider value={storeRef.current}>
            {children}
        </StoreContext.Provider>
    );
}

// Overload signatures for the useStore hook
export function useStore(): StoreState;
export function useStore<T>(selector: (state: StoreState) => T): T;

/**
 * Custom hook to access the Zustand store.
 * It can be called with a selector function to get a specific slice of the state,
 * or without any arguments to get the entire state.
 * It also handles server-side rendering by returning a server-side state
 * until the store has been hydrated on the client.
 */
export function useStore<T>(selector?: (state: StoreState) => T): T | StoreState {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }

  // Determine the selector, defaulting to returning the whole state.
  const a = selector || ((s: StoreState) => s);
  const result = useZustandStore(store, a);

  const hasHydrated = useZustandStore(store, (s) => s._hasHydrated);

  // On the server or before hydration, return the initial state.
  // Use the selector if provided, otherwise the whole initial state.
  if (!hasHydrated) {
    const initialState = store.getState();
    return selector ? selector(initialState) : initialState;
  }

  return result;
}
