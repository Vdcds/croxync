"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

interface CustomThemeProviderProps extends Omit<ThemeProviderProps, "defaultTheme" | "enableSystem"> {
  defaultTheme?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  ...props
}: CustomThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
