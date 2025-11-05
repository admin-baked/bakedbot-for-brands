export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  imageHint: string;
};

export type Order = {
  id: string;
  customer: string;
  date: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
};
