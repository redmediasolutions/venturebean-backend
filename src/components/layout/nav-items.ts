import { Award, Blocks, FileText, Folder, Image, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";
import { SECTIONS } from "@/features/sections/lib/sections";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Small heading above the group (optional). */
  title?: string;
  items: NavItem[];
}

/**
 * Show the general-purpose Posts / Categories / Custom Fields screens too.
 * Off by default — editors only need the sections below.
 */
export const SHOW_ADVANCED = false;

/** The menu on the left. Add, remove or reorder items here. */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  { items: [{ label: "Posts", href: "/posts", icon: LayoutDashboard }] },
  {
    title: "Website",
    items: [
      { label: "Logos", href: "/logos", icon: Award },
      { label: "Media", href: "/media", icon: Image },
    ],
  },
  ...(SHOW_ADVANCED
    ? [
        {
          title: "Advanced",
          items: [
            { label: "All Posts", href: "/posts", icon: FileText },
            { label: "Categories", href: "/categories", icon: Folder },
            { label: "Custom Fields", href: "/custom-fields", icon: Blocks },
          ],
        },
      ]
    : []),
  { title: "Admin", items: [{ label: "Settings", href: "/settings", icon: Settings }] },
];
