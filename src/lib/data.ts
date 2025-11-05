import type { Product, Order } from './types';
import { PlaceHolderImages } from './placeholder-images';

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
    imageUrl: getPlaceholderImage('product1').url,
    imageHint: getPlaceholderImage('product1').hint,
  },
  {
    id: '2',
    name: 'Galaxy Gummies',
    category: 'Edibles',
    price: 22.5,
    imageUrl: getPlaceholderImage('product2').url,
    imageHint: getPlaceholderImage('product2').hint,
  },
  {
    id: '3',
    name: 'Supernova Suckers',
    category: 'Edibles',
    price: 18.0,
    imageUrl: getPlaceholderImage('product3').url,
    imageHint: getPlaceholderImage('product3').hint,
  },
  {
    id: '4',
    name: 'Orion Originals',
    category: 'Flower',
    price: 45.0,
    imageUrl: getPlaceholderImage('product4').url,
    imageHint: getPlaceholderImage('product4').hint,
  },
  {
    id: '5',
    name: 'Nebula Nugs',
    category: 'Flower',
    price: 55.0,
    imageUrl: getPlaceholderImage('product5').url,
    imageHint: getPlaceholderImage('product5').hint,
  },
  {
    id: '6',
    name: "Pluto's Punch",
    category: 'Flower',
    price: 50.0,
    imageUrl: getPlaceholderImage('product6').url,
    imageHint: getPlaceholderImage('product6').hint,
  },
  {
    id: '7',
    name: 'Vaporwave Wonder',
    category: 'Vapes',
    price: 35.0,
    imageUrl: getPlaceholderImage('product7').url,
    imageHint: getPlaceholderImage('product7').hint,
  },
  {
    id: '8',
    name: 'Stardust Stick',
    category: 'Vapes',
    price: 40.0,
    imageUrl: getPlaceholderImage('product8').url,
    imageHint: getPlaceholderImage('product8').hint,
  },
  {
    id: '9',
    name: 'Comet Cartridge',
    category: 'Vapes',
    price: 38.5,
    imageUrl: getPlaceholderImage('product9').url,
    imageHint: getPlaceholderImage('product9').hint,
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
