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

// Type for the Order document stored in Firestore
export type OrderDoc = {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerBirthDate: string; // Stored as ISO string
  locationId: string;
  orderDate: Timestamp;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  idImageUrl?: string;
};

// Type for the OrderItem sub-collection documents
export type OrderItemDoc = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};
