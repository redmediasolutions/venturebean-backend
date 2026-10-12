import {
  AlignLeft,
  AtSign,
  Calendar,
  FileText,
  Hash,
  Image,
  Images,
  Link,
  List,
  Paperclip,
  ToggleRight,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { CustomField, FieldType } from "../types";

interface FieldTypeInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  /** What the value looks like in Firestore / Astro. */
  valueHint: string;
}

/** Every field type you can add to a Field Group. */
export const FIELD_TYPES: Record<FieldType, FieldTypeInfo> = {
  text: { label: "Text", description: "A single line of text", icon: Type, valueHint: "string" },
  textarea: { label: "Text Area", description: "Several lines of plain text", icon: AlignLeft, valueHint: "string" },
  richtext: { label: "Rich Text", description: "Formatted text with headings, links, images", icon: FileText, valueHint: "HTML string" },
  number: { label: "Number", description: "A number, e.g. price or order", icon: Hash, valueHint: "number | null" },
  email: { label: "Email", description: "An email address", icon: AtSign, valueHint: "string" },
  url: { label: "Link (URL)", description: "A web address", icon: Link, valueHint: "string" },
  date: { label: "Date", description: "Pick a date from a calendar", icon: Calendar, valueHint: "string (YYYY-MM-DD)" },
  select: { label: "Dropdown", description: "Choose one option from a list", icon: List, valueHint: "string" },
  toggle: { label: "Yes / No", description: "An on/off switch", icon: ToggleRight, valueHint: "boolean" },
  image: { label: "Image", description: "One image from the Media Library", icon: Image, valueHint: "{ url, alt, width, height } | null" },
  gallery: { label: "Gallery", description: "Several images", icon: Images, valueHint: "Array of { url, alt, … }" },
  file: { label: "File", description: "A PDF or any other file", icon: Paperclip, valueHint: "{ url, name } | null" },
};

export const FIELD_TYPE_ORDER = Object.keys(FIELD_TYPES) as FieldType[];

/** The starting value for a field when a new post is created. */
export function emptyValueFor(type: FieldType): unknown {
  switch (type) {
    case "number":
    case "image":
    case "file":
      return null;
    case "toggle":
      return false;
    case "gallery":
      return [];
    default:
      return "";
  }
}

export function isEmptyValue(field: CustomField, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (field.type === "toggle") return false;
  return false;
}

export function newField(): CustomField {
  return {
    id: Math.random().toString(36).slice(2, 10),
    label: "",
    name: "",
    type: "text",
    required: false,
    instructions: "",
    placeholder: "",
    options: [],
  };
}
