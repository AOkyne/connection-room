// Theme and styling utilities
import { appConfig } from "./config";

export const theme = {
  colors: appConfig.colors,

  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },

  typography: {
    h1: "text-4xl md:text-5xl font-bold",
    h2: "text-3xl md:text-4xl font-bold",
    h3: "text-2xl md:text-3xl font-bold",
    h4: "text-xl md:text-2xl font-bold",
    h5: "text-lg md:text-xl font-semibold",
    h6: "text-base md:text-lg font-semibold",
    body: "text-base leading-relaxed",
    bodySmall: "text-sm leading-relaxed",
    caption: "text-xs text-gray-600",
  },

  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px rgba(0, 0, 0, 0.08)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.1)",
  },

  borderRadius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },

  transitions: {
    fast: "150ms ease-in-out",
    normal: "250ms ease-in-out",
    slow: "350ms ease-in-out",
  },
};

// Utility function for conditional class names
export function classNames(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
