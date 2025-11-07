import { Timestamp } from 'firebase/firestore';

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  prices: { [locationId: string]: number };
  imageUrl: string;
  imageHint: string;
  description: string;
  likes?: number;
  dislikes?: number;
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

export type Order = {
  id: string;
  customer: string;
  date: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
};

export type CartItem = Product & { quantity: number };

export type Review = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  text: string;
  verificationImageUrl: string;
  createdAt: Timestamp;
};
