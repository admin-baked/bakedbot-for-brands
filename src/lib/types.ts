export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  imageHint: string;
  description: string;
};

export type Order = {
  id: string;
  customer: string;
  date: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
};

export type CartItem = Product & { quantity: number };
