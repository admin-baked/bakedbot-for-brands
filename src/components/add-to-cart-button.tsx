'use client';

import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Check } from 'lucide-react';
import type { Product } from '@/types/domain';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddToCartButtonProps {
    product: Product;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function AddToCartButton({ product, variant = "default", size = "lg", className }: AddToCartButtonProps) {
    const { addToCart, selectedRetailerId } = useStore();
    const { toast } = useToast();
    const [showSuccess, setShowSuccess] = useState(false);

    const handleAddToCart = useCallback(() => {
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

        // Trigger success animation
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1200);

        toast({
            title: 'Added to Cart',
            description: `${product.name} has been added to your cart.`,
        });
    }, [addToCart, product, selectedRetailerId, toast]);

    return (
        <motion.div
            whileTap={{ scale: 0.96 }}
            className="inline-flex"
        >
            <Button
                onClick={handleAddToCart}
                variant={showSuccess ? 'outline' : variant}
                size={size}
                className={className}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {showSuccess ? (
                        <motion.span
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2"
                        >
                            <Check className="w-4 h-4 text-green-500" />
                            Added!
                        </motion.span>
                    ) : (
                        <motion.span
                            key="cart"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Add to Cart
                        </motion.span>
                    )}
                </AnimatePresence>
            </Button>
        </motion.div>
    );
}
