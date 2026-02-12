'use client';

/**
 * Animated Slide Wrapper
 *
 * Wraps slide content in AnimatePresence for smooth transitions
 * between slides during presenter mode.
 */

import { motion, AnimatePresence } from 'framer-motion';

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

interface AnimatedSlideWrapperProps {
  slideKey: string;
  children: React.ReactNode;
}

export function AnimatedSlideWrapper({ slideKey, children }: AnimatedSlideWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slideKey}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
