
import type { Product } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const DEMO_PRODUCTS: Product[] = [
    {
      id: 'demo-1',
      name: 'OG Galaxy',
      category: 'Flower',
      price: 55.00,
      prices: { '1': 55.00, '2': 58.00, '3': 54.00 },
      imageUrl: PlaceHolderImages.find(p => p.id === 'product4')?.imageUrl || 'https://picsum.photos/seed/4/600/400',
      imageHint: PlaceHolderImages.find(p => p.id === 'product4')?.imageHint || 'cannabis flower',
      description: 'A classic indica-dominant strain known for its potent relaxing effects and earthy pine aroma. An eighth (3.5g).',
      likes: 450,
      dislikes: 25,
    },
    {
      id: 'demo-2',
      name: 'CBD Gummy Bears',
      category: 'Edibles',
      price: 20.00,
      prices: { '1': 20.00, '2': 21.00, '3': 19.50 },
      imageUrl: PlaceHolderImages.find(p => p.id === 'product2')?.imageUrl || 'https://picsum.photos/seed/2/600/400',
      imageHint: PlaceHolderImages.find(p => p.id === 'product2')?.imageHint || 'cannabis gummy',
      description: 'Fruity, fun, and relaxing. These CBD-dominant gummies are great for unwinding without a strong high.',
      likes: 150,
      dislikes: 3,
    },
];

export type DemoLocation = { id: string; name: string; city?: string; state?: string; lat: number, lon: number, address: string, zip: string };

export const DEMO_LOCATIONS: DemoLocation[] = [
    {
        id: 'loc-chi',
        name: 'Demo Dispensary – River North',
        address: '420 N State St',
        city: 'Chicago',
        state: 'IL',
        zip: '60654',
        lat: 41.8896,
        lon: -87.6284
    },
    {
        id: 'loc-det',
        name: 'Demo Dispensary – Corktown',
        address: '123 Michigan Ave',
        city: 'Detroit',
        state: 'MI',
        zip: '48226',
        lat: 42.3288,
        lon: -83.0645
    },
];
