
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

export interface StoreState {
  _hasHydrated: boolean;
  // Cart State
  cartItems: CartItem[];
  
  // App/UI State
  theme: Theme;
  menuStyle: 'default' | 'alt';
  selectedRetailerId: string | null;
  favoriteRetailerId: string | null;
  isCartSheetOpen: boolean;
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
  setSelectedRetailerId: (id: string | null) => void;
  setFavoriteRetailerId: (id: string | null) => void;
  setCartSheetOpen: (isOpen: boolean) => void;
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

  // Cart Actions
  addToCart: (product: Product, retailerId?: string | null) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => { subtotal: number; taxes: number; total: number };
  getItemCount: () => number;
}


export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      // Cart State
      cartItems: [],
      
      // App/UI State
      theme: 'green' as Theme,
      menuStyle: 'default' as 'default' | 'alt',
      selectedRetailerId: null,
      favoriteRetailerId: null,
      isCartSheetOpen: false,
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
      setSelectedRetailerId: (id: string | null) => set({ selectedRetailerId: id }),
      setFavoriteRetailerId: (id: string | null) => set({ favoriteRetailerId: id }),
      setCartSheetOpen: (isOpen: boolean) => set({ isCartSheetOpen: isOpen }),
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
      
      // Cart Actions
      addToCart: (product, retailerId) =>
        set((state) => {
          const existingItem = state.cartItems.find((i) => i.id === product.id);
          
          const price = (retailerId && product.prices?.[retailerId])
            ? product.prices[retailerId]
            : product.price;

          if (existingItem) {
            return {
              cartItems: state.cartItems.map((i) =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1, price } : i
              ),
            };
          }
          return { cartItems: [...state.cartItems, { ...product, quantity: 1, price }] };
        }),

      removeFromCart: (itemId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((i) => i.id !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { cartItems: state.cartItems.filter((i) => i.id !== itemId) };
          }
          return {
            cartItems: state.cartItems.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
        }),
        
      clearCart: () => set({ cartItems: [] }),

      getCartTotal: () => {
        const subtotal = get().cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const taxes = subtotal * 0.15; 
        const total = subtotal + taxes;
        return { subtotal, taxes, total };
      },

      getItemCount: () => {
        return get().cartItems.reduce((total, item) => total + item.quantity, 0);
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
      partialize: (state) => ({
        cartItems: state.cartItems,
        theme: state.theme,
        menuStyle: state.menuStyle,
        selectedRetailerId: state.selectedRetailerId,
        favoriteRetailerId: state.favoriteRetailerId, // Ensure this is persisted
        isCartSheetOpen: state.isCartSheetOpen,
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
    
