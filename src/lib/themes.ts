
export type Theme = "default" | "stone" | "orange" | "green" | "blue" | "yellow";

type ThemeConfig = {
  name: Theme;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

export const themes: ThemeConfig[] = [
  {
    name: "default",
    cssVars: {
      light: {
        background: "200 17% 94%",
        foreground: "240 10% 3.9%",
        primary: "262 52% 47%",
        "primary-foreground": "0 0% 98%",
        accent: "36 100% 50%",
      },
      dark: {
        background: "240 5% 10%",
        foreground: "0 0% 98%",
        primary: "262 70% 65%",
        "primary-foreground": "0 0% 98%",
        accent: "36 100% 50%",
      },
    },
  },
  {
    name: "stone",
    cssVars: {
      light: {
        background: "240 4.8% 95.9%",
        foreground: "240 10% 3.9%",
        primary: "240 5.9% 10%",
        "primary-foreground": "0 0% 98%",
        accent: "240 3.7% 15.9%",
      },
      dark: {
        background: "240 5.9% 10%",
        foreground: "0 0% 98%",
        primary: "0 0% 98%",
        "primary-foreground": "240 5.9% 10%",
        accent: "240 3.7% 15.9%",
      },
    },
  },
  {
    name: "orange",
    cssVars: {
      light: {
        background: "20 14.3% 95.9%",
        foreground: "24 9.8% 10%",
        primary: "24.6 95% 53.1%",
        "primary-foreground": "60 9.1% 97.8%",
        accent: "20.5 90.2% 48.2%",
      },
      dark: {
        background: "20 14.3% 4.1%",
        foreground: "60 9.1% 97.8%",
        primary: "24.6 95% 53.1%",
        "primary-foreground": "60 9.1% 97.8%",
        accent: "20.5 90.2% 48.2%",
      },
    },
  },
  {
    name: "green",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "142 80% 5%",
        primary: "142.1 76.2% 36.3%",
        "primary-foreground": "0 0% 100%",
        accent: "142.1 70.2% 46.3%",
      },
      dark: {
        background: "142 80% 4%",
        foreground: "0 0% 98%",
        primary: "142.1 76.2% 36.3%",
        "primary-foreground": "0 0% 100%",
        accent: "142.1 70.2% 46.3%",
      },
    },
  },
  {
    name: "blue",
    cssVars: {
      light: {
        background: "222 80% 96%",
        foreground: "222 80% 10%",
        primary: "221.2 83.2% 53.3%",
        "primary-foreground": "221.2 83.2% 98.3%",
        accent: "217.2 91.2% 59.8%",
      },
      dark: {
        background: "222 80% 4%",
        foreground: "222 20% 90%",
        primary: "221.2 83.2% 53.3%",
        "primary-foreground": "221.2 83.2% 98.3%",
        accent: "217.2 91.2% 59.8%",
      },
    },
  },
  {
    name: "yellow",
    cssVars: {
      light: {
        background: "48 90% 96%",
        foreground: "48 90% 10%",
        primary: "47.9 95.8% 53.1%",
        "primary-foreground": "47.9 95.8% 98.1%",
        accent: "45.4 93.4% 51.6%",
      },
      dark: {
        background: "48 90% 4%",
        foreground: "48 20% 90%",
        primary: "47.9 95.8% 53.1%",
        "primary-foreground": "47.9 95.8% 98.1%",
        accent: "45.4 93.4% 51.6%",
      },
    },
  },
];
