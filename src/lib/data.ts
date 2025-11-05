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
    description: 'Deliciously chewy caramels infused with premium, full-spectrum cannabis oil. A sweet escape to the cosmos.'
  },
  {
    id: '2',
    name: 'Galaxy Gummies',
    category: 'Edibles',
    price: 22.5,
    imageUrl: getPlaceholderImage('product2').url,
    imageHint: getPlaceholderImage('product2').hint,
    description: 'Starburst-flavored gummies that pack a potent punch. Each gummy is a journey through a galaxy of flavor.'
  },
  {
    id: '3',
    name: 'Supernova Suckers',
    category: 'Edibles',
    price: 18.0,
    imageUrl: getPlaceholderImage('product3').url,
    imageHint: getPlaceholderImage('product3').hint,
    description: 'Long-lasting lollipops with a cosmic core. Perfect for a slow, steady lift-off into a state of bliss.'
  },
  {
    id: '4',
    name: 'Orion Originals',
    category: 'Flower',
    price: 45.0,
    imageUrl: getPlaceholderImage('product4').url,
    imageHint: getPlaceholderImage('product4').hint,
    description: 'A classic, earthy strain known for its relaxing and euphoric effects. A constellation of quality in every bud.'
  },
  {
    id: '5',
    name: 'Nebula Nugs',
    category: 'Flower',
    price: 55.0,
    imageUrl: getPlaceholderImage('product5').url,
    imageHint: getPlaceholderImage('product5').hint,
    description: 'Dense, trichome-covered nugs with a sweet and pungent aroma. A premium flower for the discerning connoisseur.'
  },
  {
    id: '6',
    name: "Pluto's Punch",
    category: 'Flower',
    price: 50.0,
    imageUrl: getPlaceholderImage('product6').url,
    imageHint: getPlaceholderImage('product6').hint,
    description: 'A powerful indica-dominant hybrid that delivers a knockout punch of relaxation. Perfect for evening use.'
  },
  {
    id: '7',
    name: 'Vaporwave Wonder',
    category: 'Vapes',
    price: 35.0,
    imageUrl: getPlaceholderImage('product7').url,
    imageHint: getPlaceholderImage('product7').hint,
    description: 'A smooth, flavorful vape with a hint of nostalgia. Experience a wave of calm and creativity with every puff.'
  },
  {
    id: '8',
    name: 'Stardust Stick',
    category: 'Vapes',
    price: 40.0,
    imageUrl: getPlaceholderImage('product8').url,
    imageHint: getPlaceholderImage('product8').hint,
    description: 'A discreet and potent vape pen filled with pure, triple-distilled cannabis oil. A sprinkle of stardust in your pocket.'
  },
  {
    id: '9',
    name: 'Comet Cartridge',
    category: 'Vapes',
    price: 38.5,
    imageUrl: getPlaceholderImage('product9').url,
    imageHint: getPlaceholderImage('product9').hint,
    description: 'A high-terpene cartridge that delivers a blast of flavor and effects. A fast-acting comet of cannabis excellence.'
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
