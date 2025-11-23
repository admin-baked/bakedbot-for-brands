
import type { Product, Retailer, Review, UserInteraction, OrderDoc, Location } from '@/types/domain';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Timestamp } from 'firebase/firestore';

// This is now exported so the chatbot can use it as a fallback.
export const defaultChatbotIcon = 'https://bakedbot.ai/wp-content/uploads/2025/11/SMokey-Chat-scaled.png';

// Also exporting defaultLogo from here for consistency in demo setup.
export const defaultLogo = 'https://minoritycannabis.org/wp-content/uploads/2025/03/att.yne0IiSw3BIPejWlvseVXNlEGfA5E9CjF7HO2ecLTGQ.jpeg';


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


export const demoCustomer = {
    favoriteRetailerId: 'disp-ny-alta-dispensary',
    orders: [
        { id: 'demo1', userId: 'demoUser', createdAt: Timestamp.now(), status: 'completed', totals: { total: 45.00 } },
        { id: 'demo2', userId: 'demoUser', createdAt: Timestamp.now(), status: 'ready', totals: { total: 65.00 } },
    ] as Partial<OrderDoc>[],
    reviews: [
        { id: 'rev1', productId: 'demo-40t-gg4', userId: 'demoUser1', brandId: 'default', rating: 5, text: 'This Gorilla Glue #4 from 40 Tons is the real deal. Incredibly relaxing, perfect for ending a stressful week.', createdAt: Timestamp.fromDate(new Date('2024-05-20T19:30:00Z')) },
        { id: 'rev2', productId: 'demo-40t-runtz-vape', userId: 'demoUser2', brandId: 'default', rating: 5, text: 'The Runtz vape cart has an amazing fruity taste and a super happy, euphoric high. My new favorite for sure!', createdAt: Timestamp.fromDate(new Date('2024-05-21T12:00:00Z')) },
        { id: 'rev3', productId: 'demo-40t-gg4', userId: 'demoUser3', brandId: 'default', rating: 4, text: 'Solid flower, great effects. A little dry on my last batch, but still one of the best GG4 cuts I\'ve had in NY.', createdAt: Timestamp.fromDate(new Date('2024-05-22T14:15:00Z')) },
        { id: 'rev4', productId: 'demo-40t-og-preroll', userId: 'demoUser4', brandId: 'default', rating: 4, text: 'Super convenient pre-roll. Burned evenly and had that classic OG Kush effect. Good for a quick session.', createdAt: Timestamp.fromDate(new Date('2024-05-22T18:45:00Z')) },
    ] as Partial<Review>[],
    interactions: [
        { brandId: 'default', recommendedProductIds: ['demo-40t-gg4', 'demo-40t-runtz-vape'] },
        { brandId: 'default', recommendedProductIds: ['demo-40t-og-preroll'] }
    ] as Partial<UserInteraction>[],
};
