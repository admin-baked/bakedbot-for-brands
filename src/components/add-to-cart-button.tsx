'use client';

import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@/types/domain';

interface AddToCartButtonProps {
    product: Product;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function AddToCartButton({ product, variant = "default", size = "lg", className }: AddToCartButtonProps) {
    const { addToCart, selectedRetailerId } = useStore();
    const { toast } = useToast();

    const handleAddToCart = () => {
        if (!selectedRetailerId) {
            const locator = document.getElementById('locator');
            if (locator) {
                locator.scrollIntoView({ behavior: 'smooth' });
                locator.classList.add('animate-pulse', 'ring-2', 'ring-primary', 'rounded-lg');
                setTimeout(() => {
                    locator.classList.remove('animate-pulse', 'ring-2', 'ring-primary', 'rounded-lg');
                }, 2000);
            }
            toast({
                variant: 'destructive',
                title: 'No Location Selected',
                description: 'Please select a dispensary location before adding items to your cart.',
            });
            return;
        }

        addToCart(product, selectedRetailerId);
        toast({
            title: 'Added to Cart',
            description: `${product.name} has been added to your cart.`,
        });
    };

    return (
        <Button
            onClick={handleAddToCart}
            variant={variant}
            size={size}
            className={className}
        >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
        </Button>
    );
}
