import { BookOpen, Building, Lightbulb, Newspaper, Wrench, type LucideIcon } from "lucide-react";

/**
 * The Knowledge Hub sections shown in the sidebar.
 *
 * Each section is a CATEGORY (child of "Knowledge Hub") — so your Astro site can
 * fetch them with getPosts({ category: "insights" }) etc.
 * To add a new section, add a line here. That's all.
 */
export interface Section {
  /** Category slug — also used in the URL: /content/<slug> */
  slug: string;
  /** Name in the sidebar and page title. */
  name: string;
  /** One item, lowercase — used in buttons like "New insight". */
  itemLabel: string;
  description: string;
  icon: LucideIcon;
}

export const KNOWLEDGE_HUB = { name: "Knowledge Hub", slug: "knowledge-hub" };

export const SECTIONS: Section[] = [
  {
    slug: "media-spotlight",
    name: "Media Spotlight",
    itemLabel: "media item",
    description: "Press features, keynote talks, panels and recorded conversations.",
    icon: Newspaper,
  },
  {
    slug: "industry-perspectives",
    name: "Industry Perspectives",
    itemLabel: "perspective",
    description: "Research-driven viewpoints on shifts in industries, leadership and business models.",
    icon: Building,
  },
  {
    slug: "toolkit",
    name: "Toolkit",
    itemLabel: "tool",
    description: "Practical frameworks and assessments leaders can download and use.",
    icon: Wrench,
  },
  {
    slug: "insights",
    name: "Insights",
    itemLabel: "insight",
    description: "Lessons from advisory and coaching work.",
    icon: Lightbulb,
  },
];

export const SECTIONS_ICON = BookOpen;

export const findSection = (slug: string) => SECTIONS.find((s) => s.slug === slug);
