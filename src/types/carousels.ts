
export interface Carousel {
    id: string;
    orgId: string;
    title: string;
    description?: string;
    productIds: string[];
    active: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
