'use client';

/**
 * Academy Hero Section
 *
 * Redesigned hero with dark gradient, floating agent characters,
 * staggered Framer Motion entrance animations, and animated stats.
 */

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Play, GraduationCap } from 'lucide-react';
import { ACADEMY_PROGRAM } from '@/lib/academy/curriculum';

interface HeroSectionProps {
  totalResources: number;
  remaining: number;
  hasEmail: boolean;
  onStartLearning: () => void;
  onBookDemo: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const floatVariants = (delay: number) => ({
  animate: {
    y: [0, -12, 0],
    transition: { repeat: Infinity, duration: 4, delay, ease: 'easeInOut' as const },
  },
});

const FLOATING_AGENTS = [
  { src: '/assets/agents/smokey-main.png', alt: 'Smokey', className: 'left-[5%] top-[15%] w-28 md:w-36 lg:w-44', delay: 0 },
  { src: '/assets/agents/pops-main.png', alt: 'Pops', className: 'right-[5%] top-[10%] w-24 md:w-32 lg:w-40', delay: 1.2 },
  { src: '/assets/agents/ezal-main.png', alt: 'Ezal', className: 'left-[12%] bottom-[8%] w-20 md:w-28 lg:w-32', delay: 2.4 },
];

export function HeroSection({
  totalResources,
  remaining,
  hasEmail,
  onStartLearning,
  onBookDemo,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-emerald-950 to-gray-950 py-20 md:py-28">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-500/8 rounded-full blur-3xl" />
      </div>

      {/* Floating agent characters - hidden on mobile */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        {FLOATING_AGENTS.map((agent) => (
          <motion.div
            key={agent.alt}
            className={`absolute opacity-20 lg:opacity-30 ${agent.className}`}
            variants={floatVariants(agent.delay)}
            animate="animate"
          >
            <Image
              src={agent.src}
              alt={agent.alt}
              width={180}
              height={180}
              className="object-contain drop-shadow-2xl"
              priority={false}
            />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="container mx-auto px-4 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={itemVariants}>
            <Badge variant="secondary" className="mb-5 bg-emerald-900/60 text-emerald-300 border-emerald-700/50">
              <Sparkles className="h-3 w-3 mr-1" />
              Free Cannabis Marketing Education
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight"
          >
            Cannabis Marketing{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
              AI Academy
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
          >
            Master AI-powered cannabis marketing in 12 episodes. Learn from the 7
            BakedBot agents and become the category expert your customers need.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
          >
            <Button
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50"
              onClick={onStartLearning}
            >
              <Play className="h-5 w-5" />
              Start Learning Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-gray-600 text-gray-200 hover:bg-gray-800 hover:text-white"
              onClick={onBookDemo}
            >
              <GraduationCap className="h-5 w-5" />
              Book a Demo
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-8 md:gap-12 text-sm"
          >
            {[
              { value: ACADEMY_PROGRAM.totalEpisodes, label: 'Episodes' },
              { value: `${Math.ceil(ACADEMY_PROGRAM.totalDuration / 3600)}h+`, label: 'Content' },
              { value: totalResources, label: 'Resources' },
              { value: 7, label: 'Agent Tracks' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-bold text-emerald-400">
                  {stat.value}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Usage Counter */}
          {!hasEmail && (
            <motion.div variants={itemVariants} className="mt-8">
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                {remaining} free {remaining === 1 ? 'video' : 'videos'} remaining
              </Badge>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
