
'use client';

import { useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { themes } from '@/lib/themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, _hasHydrated } = useStore();

  useEffect(() => {
    if (_hasHydrated) {
      const selectedTheme = themes.find((t) => t.name === theme);
      if (selectedTheme) {
        const root = document.documentElement;
        
        // Remove any existing theme classes
        themes.forEach(t => root.classList.remove(t.name));
        
        // Add the new theme class
        root.classList.add(selectedTheme.name);

        // Apply light mode variables
        Object.entries(selectedTheme.cssVars.light).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });

        // Apply dark mode variables
        const darkStyle = document.createElement('style');
        darkStyle.innerHTML = `
          .dark {
            ${Object.entries(selectedTheme.cssVars.dark)
              .map(([key, value]) => `--${key}: ${value};`)
              .join('\n')}
          }
        `;
        document.head.appendChild(darkStyle);
        
        return () => {
            document.head.removeChild(darkStyle);
        }
      }
    }
  }, [theme, _hasHydrated]);

  return <>{children}</>;
}
