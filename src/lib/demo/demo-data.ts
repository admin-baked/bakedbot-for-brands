
import type { Product, Retailer, Review, UserInteraction, OrderDoc, Location } from '@/types/domain';
import { PlaceHolderImages } from '@/lib/placeholder-images';


// This is now exported so the chatbot can use it as a fallback.
// Using cloud storage assets
export const defaultChatbotIcon = 'https://storage.googleapis.com/bakedbot-global-assets/SMokey-Chat-scaled.png';

// Also exporting defaultLogo from here for consistency in demo setup.
export const defaultLogo = 'https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';


export const demoProducts: Product[] = [
  {
    id: 'demo-40t-gg4',
    name: '40 Tons Gorilla Glue #4',
    category: 'Flower',
    price: 45.00,
    prices: { 'bayside-cannabis': 45.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product4')?.imageUrl || '',
    imageHint: 'cannabis flower',
    description: 'A potent hybrid strain that delivers heavy-handed euphoria and relaxation, leaving you feeling “glued” to the couch.',
    likes: 420,
    dislikes: 15,
    brandId: 'default',
  },
  {
    id: 'demo-40t-og-preroll',
    name: '40 Tons OG Kush Pre-roll',
    category: 'Pre-roll',
    price: 15.00,
    prices: { 'bayside-cannabis': 15.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product1')?.imageUrl || '',
    imageHint: 'cannabis preroll',
    description: 'A classic strain known for its stress-relieving effects, now in a convenient, ready-to-smoke pre-roll.',
    likes: 380,
    dislikes: 8,
    brandId: 'default',
  },
  {
    id: 'demo-40t-runtz-vape',
    name: '40 Tons Runtz Vape Cart',
    category: 'Vapes',
    price: 50.00,
    prices: { 'bayside-cannabis': 50.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product9')?.imageUrl || '',
    imageHint: 'vape cartridge',
    description: 'A 1g vape cartridge filled with premium Runtz oil, known for its fruity flavor profile and long-lasting euphoric high.',
    likes: 550,
    dislikes: 5,
    brandId: 'default',
  },
  {
    id: 'demo-40t-cookies',
    name: '40 Tons Cookies',
    category: 'Edibles',
    price: 25.00,
    prices: { 'bayside-cannabis': 25.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || '',
    imageHint: 'cannabis cookies',
    description: 'Deliciously baked chocolate chip cookies, each infused with 10mg of high-quality, full-spectrum cannabis extract.',
    likes: 210,
    dislikes: 3,
    brandId: 'default',
  },
  {
    id: 'demo-40t-sour-diesel',
    name: '40 Tons Sour Diesel',
    category: 'Flower',
    price: 48.00,
    prices: { 'bayside-cannabis': 48.00 },
    imageUrl: PlaceHolderImages.find(p => p.id === 'product5')?.imageUrl || '',
    imageHint: 'cannabis nug',
    description: 'An invigorating sativa-dominant strain named after its pungent, diesel-like aroma. Delivers energizing, dreamy cerebral effects.',
    likes: 485,
    dislikes: 11,
    brandId: 'default',
  }
];

export const demoRetailers: Retailer[] = [
  {
    id: 'bayside-cannabis',
    name: 'Bayside Cannabis',
    address: '224-15 Union Turnpike',
    city: 'Queens',
    state: 'NY',
    zip: '11364',
    phone: '718-555-0102',
    email: 'orders@baysidecanna.com',
    lat: 40.7381,
    lon: -73.7698,
  }
];

export const demoLocations: Location[] = demoRetailers as Location[];



