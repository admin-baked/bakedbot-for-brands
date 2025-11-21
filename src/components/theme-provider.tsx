
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

        const lightVars = {
            ...selectedTheme.cssVars.light,
            'sidebar-background': selectedTheme.cssVars.light['sidebar-background'],
            'sidebar-border': selectedTheme.cssVars.light['sidebar-border'],
            'sidebar-foreground': selectedTheme.cssVars.light.foreground,
            'sidebar-primary': selectedTheme.cssVars.light.primary,
            'sidebar-primary-foreground': selectedTheme.cssVars.light['primary-foreground'],
            'sidebar-accent': selectedTheme.cssVars.light.accent,
            'sidebar-accent-foreground': selectedTheme.cssVars.light['accent-foreground'],
            'sidebar-ring': selectedTheme.cssVars.light.ring,
        };

        // Apply light mode variables
        Object.entries(lightVars).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });

        const darkVars = {
            ...selectedTheme.cssVars.dark,
            'sidebar-background': selectedTheme.cssVars.dark['sidebar-background'],
            'sidebar-border': selectedTheme.cssVars.dark['sidebar-border'],
            'sidebar-foreground': selectedTheme.cssVars.dark.foreground,
            'sidebar-primary': selectedTheme.cssVars.dark.primary,
            'sidebar-primary-foreground': selectedTheme.cssVars.dark['primary-foreground'],
            'sidebar-accent': selectedTheme.cssVars.dark.accent,
            'sidebar-accent-foreground': selectedTheme.cssVars.dark['accent-foreground'],
            'sidebar-ring': selectedTheme.cssVars.dark.ring,
        };

        // Apply dark mode variables
        const darkStyle = document.createElement('style');
        darkStyle.innerHTML = `
          .dark {
            ${Object.entries(darkVars)
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
