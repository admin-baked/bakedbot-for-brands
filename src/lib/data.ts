
import type { Product, Order } from './types';
import { PlaceHolderImages } from './placeholder-images';
import type { Location } from '@/hooks/use-store';

const getPlaceholderImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  if (image) {
    return { url: image.imageUrl, hint: image.imageHint };
  }
  return {
    url: `https://picsum.photos/seed/${id}/400/400`,
    hint: 'placeholder image',
  };
};

export const products: Product[] = [
  {
    id: '1',
    name: 'Cosmic Caramels',
    category: 'Edibles',
    price: 25.0,
    prices: { demo1: 25.0, demo2: 26.5, demo3: 24.0 },
    imageUrl: getPlaceholderImage('product1').url,
    imageHint: getPlaceholderImage('product1').hint,
    description: 'Deliciously chewy caramels infused with premium, full-spectrum cannabis oil. A sweet escape to the cosmos.',
    likes: 12,
    dislikes: 1,
  },
  {
    id: '2',
    name: 'Galaxy Gummies',
    category: 'Edibles',
    price: 22.5,
    prices: { demo1: 22.5, demo2: 23.0, demo3: 22.0 },
    imageUrl: getPlaceholderImage('product2').url,
    imageHint: getPlaceholderImage('product2').hint,
    description: 'Starburst-flavored gummies that pack a potent punch. Each gummy is a journey through a galaxy of flavor.',
    likes: 42,
    dislikes: 3,
  },
  {
    id: '3',
    name: 'Supernova Suckers',
    category: 'Edibles',
    price: 18.0,
    prices: { demo1: 18.0, demo2: 19.0, demo3: 17.5 },
    imageUrl: getPlaceholderImage('product3').url,
    imageHint: getPlaceholderImage('product3').hint,
    description: 'Long-lasting lollipops with a cosmic core. Perfect for a slow, steady lift-off into a state of bliss.',
    likes: 25,
    dislikes: 0,
  },
  {
    id: '4',
    name: 'Orion Originals',
    category: 'Flower',
    price: 45.0,
    prices: { demo1: 45.0, demo2: 48.0, demo3: 44.0 },
    imageUrl: getPlaceholderImage('product4').url,
    imageHint: getPlaceholderImage('product4').hint,
    description: 'A classic, earthy strain known for its relaxing and euphoric effects. A constellation of quality in every bud.',
    likes: 89,
    dislikes: 2,
  },
  {
    id: '5',
    name: 'Nebula Nugs',
    category: 'Flower',
    price: 55.0,
    prices: { demo1: 55.0, demo2: 58.0, demo3: 54.0 },
    imageUrl: getPlaceholderImage('product5').url,
    imageHint: getPlaceholderImage('product5').hint,
    description: 'Dense, trichome-covered nugs with a sweet and pungent aroma. A premium flower for the discerning connoisseur.',
    likes: 102,
    dislikes: 5,
  },
  {
    id: '6',
    name: "Pluto's Punch",
    category: 'Flower',
    price: 50.0,
    prices: { demo1: 50.0, demo2: 52.5, demo3: 49.0 },
    imageUrl: getPlaceholderImage('product6').url,
    imageHint: getPlaceholderImage('product6').hint,
    description: 'A powerful indica-dominant hybrid that delivers a knockout punch of relaxation. Perfect for evening use.',
    likes: 76,
    dislikes: 4,
  },
  {
    id: '7',
    name: 'Vaporwave Wonder',
    category: 'Vapes',
    price: 35.0,
    prices: { demo1: 35.0, demo2: 36.0, demo3: 34.0 },
    imageUrl: getPlaceholderImage('product7').url,
    imageHint: getPlaceholderImage('product7').hint,
    description: 'A smooth, flavorful vape with a hint of nostalgia. Experience a wave of calm and creativity with every puff.',
    likes: 33,
    dislikes: 1,
  },
  {
    id: '8',
    name: 'Stardust Stick',
    category: 'Vapes',
    price: 40.0,
    prices: { demo1: 40.0, demo2: 41.0, demo3: 39.5 },
    imageUrl: getPlaceholderImage('product8').url,
    imageHint: getPlaceholderImage('product8').hint,
    description: 'A discreet and potent vape pen filled with pure, triple-distilled cannabis oil. A sprinkle of stardust in your pocket.',
    likes: 58,
    dislikes: 2,
  },
  {
    id: '9',
    name: 'Comet Cartridge',
    category: 'Vapes',
    price: 38.5,
    prices: { demo1: 38.5, demo2: 39.0, demo3: 38.0 },
    imageUrl: getPlaceholderImage('product9').url,
    imageHint: getPlaceholderImage('product9').hint,
    description: 'A high-terpene cartridge that delivers a blast of flavor and effects. A fast-acting comet of cannabis excellence.',
    likes: 61,
    dislikes: 0,
  },
];

export const orders: Order[] = [
  { id: 'ORD-001', customer: 'John Doe', date: '2023-10-26', status: 'Delivered', total: 70.0 },
  { id: 'ORD-002', customer: 'Jane Smith', date: '2023-10-25', status: 'Shipped', total: 110.0 },
  { id: 'ORD-003', customer: 'Sam Wilson', date: '2023-10-24', status: 'Pending', total: 45.0 },
  { id: 'ORD-004', customer: 'Bucky Barnes', date: '2023-10-23', status: 'Delivered', total: 85.5 },
  { id: 'ORD-005', customer: 'Natasha Romanoff', date: '2023-10-22', status: 'Cancelled', total: 35.0 },
  { id: 'ORD-006', customer: 'Steve Rogers', date: '2023-10-21', status: 'Delivered', total: 125.0 },
  { id: 'ORD-007', customer: 'Tony Stark', date: '2023-10-20', status: 'Shipped', total: 250.75 },
];

export const demoLocations: Location[] = [
    { id: 'demo1', name: 'Windy City Cannabis', address: '923 W Weed St', city: 'Chicago', state: 'IL', zip: '60642', phone: '(312) 874-7042', email: 'orders@windycity.demo', lat: 41.908, lon: -87.653 },
    { id: 'demo2', name: 'Sunnyside Dispensary', address: '436 N Clark St', city: 'Chicago', state: 'IL', zip: '60654', phone: '(312) 212-0300', email: 'orders@sunnyside.demo', lat: 41.890, lon: -87.632 },
    { id: 'demo3', name: 'Dispensary 33', address: '5001 N Clark St', city: 'Chicago', state: 'IL', zip: '60640', phone: '(773) 754-8822', email: 'orders@dispensary33.demo', lat: 41.973, lon: -87.668 },
];
