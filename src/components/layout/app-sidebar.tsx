"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { ProfileMenu } from "@/components/profile-menu";
import { Button } from "@/components/ui/button";
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
        <Button asChild className="w-full justify-start" onClick={onNavigate}>
          <Link href="/posts/new">
            <Plus /> New Post
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        <p className="px-2 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Menu</p>
        {NAV_ITEMS.map((item) => {
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
