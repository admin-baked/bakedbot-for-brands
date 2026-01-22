import { defineConfig } from 'tsup';
import path from 'path';
import alias from 'esbuild-plugin-alias';

export default defineConfig({
    entry: {
        chatbot: 'src/embed/index.tsx',
        locator: 'src/embed/locator.tsx',
        menu: 'src/embed/menu.tsx',
    },
    outExtension({ format }) {
        return {
            js: `.js`,
        }
    },
    format: ['iife'],
    globalName: 'BakedBotEmbed',
    outDir: 'public/embed',
    clean: true,
    minify: true,
    bundle: true,
    target: 'es2020',
    platform: 'browser',
    treeshake: true,
    dts: false,
    sourcemap: false,
    name: 'chatbot',
    // Inject process.env for React
    define: {
        'process.env.NODE_ENV': '"production"',
    },
    esbuildPlugins: [
        alias({
            '@/lib/logger': path.resolve(__dirname, 'src/embed/mock-logger.ts'),
            '@google-cloud/logging': path.resolve(__dirname, 'src/embed/mock-logger.ts'), // Just in case
        }),
    ],
    // Skip externalizing react to bundle it in
    noExternal: ['react', 'react-dom', 'lucide-react', 'clsx', 'tailwind-merge', '@radix-ui/react-slot', '@radix-ui/react-toast', '@radix-ui/react-tooltip', '@radix-ui/react-collapsible', '@radix-ui/react-avatar', '@hookform/resolvers', 'react-hook-form', 'zod', 'cmdk', 'vaul', '@tanstack/react-query', 'next-themes'],
});
