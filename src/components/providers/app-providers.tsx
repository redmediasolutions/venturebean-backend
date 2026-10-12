"use client";

import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors={false} closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}
