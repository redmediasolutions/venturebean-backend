"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";
import { ProfileMenu } from "@/components/profile-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SECTIONS } from "@/features/sections/lib/sections";
import { useSiteSettings } from "@/features/settings/hooks/use-site-settings";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const siteName = settings.siteName || "My Website";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          {siteName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold">{siteName}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">Content Manager</p>
        </div>
      </div>

      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Plus /> Create new
              </span>
              <ChevronDown className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Knowledge Hub</DropdownMenuLabel>
            {SECTIONS.map((s) => (
              <DropdownMenuItem key={s.slug} asChild onClick={onNavigate}>
                <Link href={`/content/${s.slug}/new`}>
                  <s.icon /> {s.name}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild onClick={onNavigate}>
              <Link href="/logos">
                <Award /> Logos
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.title && (
              <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{group.title}</p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    active && "bg-sidebar-accent text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <ProfileMenu />
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarContent />
    </aside>
  );
}
