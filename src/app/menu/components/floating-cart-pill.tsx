
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';


export const FloatingCartPill = () => {
    const { getItemCount, getCartTotal, toggleCart } = useCart();
    const { selectedLocationId } = useStore();
    const itemCount = getItemCount();
    const subtotal = getCartTotal(selectedLocationId);

    return (
        <AnimatePresence>
            {itemCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    transition={{ ease: "easeInOut", duration: 0.3 }}
                    className="fixed bottom-6 left-6 z-50"
                >
                    <Card className="shadow-2xl">
                        <CardContent className="p-0">
                            <div className="flex items-center gap-4 p-3">
                                <Badge>{itemCount}</Badge>
                                <span className="font-semibold text-lg">${subtotal.toFixed(2)}</span>
                                <Button onClick={toggleCart}>
                                    <CreditCard className="mr-2 h-4 w-4" /> View Cart
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
