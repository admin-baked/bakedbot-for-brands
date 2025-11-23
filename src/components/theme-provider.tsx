
'use client';

import { useEffect, type ReactNode } from 'react';
import { useStore } from '@/hooks/use-store';
import { themes } from '@/lib/themes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, _hasHydrated } = useStore();

  useEffect(() => {
    if (_hasHydrated) {
      const selectedTheme = themes.find((t) => t.name === theme);
      if (selectedTheme) {
        const root = document.documentElement;
        
        // Remove existing theme classes from the themes list
        themes.forEach(t => root.classList.remove(t.name));
        
        // Add the new theme class
        root.classList.add(selectedTheme.name);

        const applyThemeVariables = (vars: Record<string, string>, prefix: string) => {
            Object.entries(vars).forEach(([key, value]) => {
                root.style.setProperty(`--${key}`, value);
            });

            // Specific sidebar variables
            const sidebarVars = {
                'sidebar-background': vars['sidebar-background'] || (prefix === 'dark' ? vars['background'] : vars['muted']),
                'sidebar-border': vars['sidebar-border'] || (prefix === 'dark' ? vars['border'] : vars['border']),
                'sidebar-foreground': vars['sidebar-foreground'] || vars['foreground'],
                'sidebar-primary': vars['sidebar-primary'] || vars['primary'],
                'sidebar-primary-foreground': vars['sidebar-primary-foreground'] || vars['primary-foreground'],
                'sidebar-accent': vars['sidebar-accent'] || vars['accent'],
                'sidebar-accent-foreground': vars['sidebar-accent-foreground'] || vars['accent-foreground'],
                'sidebar-ring': vars['sidebar-ring'] || vars['ring'],
            };
            Object.entries(sidebarVars).forEach(([key, value]) => {
                root.style.setProperty(`--${key}`, value);
            });
        }
        
        // Clear any existing inline styles to start fresh
        const allVars = new Set([...Object.keys(selectedTheme.cssVars.light), ...Object.keys(selectedTheme.cssVars.dark), ...Object.keys({
                'sidebar-background': '', 'sidebar-border': '', 'sidebar-foreground': '', 'sidebar-primary': '',
                'sidebar-primary-foreground': '', 'sidebar-accent': '', 'sidebar-accent-foreground': '', 'sidebar-ring': ''
            })]);
        allVars.forEach(key => root.style.removeProperty(`--${key}`));

        // Set light theme variables
        applyThemeVariables(selectedTheme.cssVars.light, 'light');
        
        // Set dark theme variables under the .dark selector
        const darkStyle = document.createElement('style');
        darkStyle.id = 'dark-theme-style';

        const darkCSS = `
          .dark {
            ${Object.entries(selectedTheme.cssVars.dark).map(([key, value]) => `--${key}: ${value};`).join('\n')}
            --sidebar-background: ${selectedTheme.cssVars.dark['sidebar-background'] || selectedTheme.cssVars.dark['background']};
            --sidebar-border: ${selectedTheme.cssVars.dark['sidebar-border'] || selectedTheme.cssVars.dark['border']};
            --sidebar-foreground: ${selectedTheme.cssVars.dark['sidebar-foreground'] || selectedTheme.cssVars.dark['foreground']};
            --sidebar-primary: ${selectedTheme.cssVars.dark['sidebar-primary'] || selectedTheme.cssVars.dark['primary']};
            --sidebar-primary-foreground: ${selectedTheme.cssVars.dark['sidebar-primary-foreground'] || selectedTheme.cssVars.dark['primary-foreground']};
            --sidebar-accent: ${selectedTheme.cssVars.dark['sidebar-accent'] || selectedTheme.cssVars.dark['accent']};
            --sidebar-accent-foreground: ${selectedTheme.cssVars.dark['sidebar-accent-foreground'] || selectedTheme.cssVars.dark['accent-foreground']};
            --sidebar-ring: ${selectedTheme.cssVars.dark['sidebar-ring'] || selectedTheme.cssVars.dark['ring']};
          }
        `;
        darkStyle.innerHTML = darkCSS.replace(/\s*\n\s*/g, ''); // Minify the CSS string

        const existingStyle = document.getElementById('dark-theme-style');
        if (existingStyle) {
            existingStyle.innerHTML = darkStyle.innerHTML;
        } else {
            document.head.appendChild(darkStyle);
        }

      }
    }
  }, [theme, _hasHydrated]);
  
  return <>{children}</>;
};
