export interface BlazeInventory {
    id: string;
    productId: string;
    productName: string;
    category: string;
    quantity: number;
    price: number;
    updatedAt: string;
}

export interface BlazeTransaction {
    id: string;
    orderNo: string;
    status: string;
    total: number;
    memberId?: string;
    createdAt: string;
}

export interface BlazeMember {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    loyaltyPoints: number;
}
