import { Blocks, FileText, Folder, Image, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** The menu on the left. Add or remove pages here. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Posts", href: "/posts", icon: FileText },
  { label: "Categories", href: "/categories", icon: Folder },
  { label: "Custom Fields", href: "/custom-fields", icon: Blocks },
  { label: "Media", href: "/media", icon: Image },
  { label: "Settings", href: "/settings", icon: Settings },
];
