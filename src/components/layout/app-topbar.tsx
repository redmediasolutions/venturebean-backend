"use client";

import { useState } from "react";
import { ExternalLink, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarContent } from "./app-sidebar";
import { useSiteSettings } from "@/features/settings/hooks/use-site-settings";

export function AppTopbar() {
  const [open, setOpen] = useState(false);
  const { settings } = useSiteSettings();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-sidebar p-0">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {settings.siteUrl && (
        <Button variant="outline" size="sm" asChild>
          <a href={settings.siteUrl} target="_blank" rel="noreferrer">
            <ExternalLink /> View website
          </a>
        </Button>
      )}
      <ThemeToggle />
    </header>
  );
}
