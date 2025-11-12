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
  brandId?: string;
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
    distance?: number; // Add this for sorting
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
  createdAt: Timestamp;
};

// Type for the Order document stored in Firestore
export type OrderDoc = {
  id: string; // Add id to the type
  userId: string;
  customer: {
      name: string;
      email: string;
  };
  items: Array<{
      productId: string;
      name: string;
      qty: number;
      price: number;
  }>;
  totals: {
      subtotal: number;
      tax: number;
      total: number;
  };
  locationId: string;
  createdAt: Timestamp;
  status: 'submitted' | 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  mode: 'demo' | 'live';
};


// Type for the OrderItem sub-collection documents
export type OrderItemDoc = {
  id: string; // Add id to the type
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

export type UserInteraction = {
  id: string;
  userId: string;
  interactionDate: Timestamp;
  query: string;
  recommendedProductIds?: string[];
};
