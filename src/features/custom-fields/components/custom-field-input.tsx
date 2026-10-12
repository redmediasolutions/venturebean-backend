"use client";

/**
 * Draws the right input for a custom field (text box, date picker,
 * image chooser, etc.) based on its type.
 */
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { FileInput, GalleryInput, ImageInput } from "@/features/media/components/media-inputs";
import type { MediaRef } from "@/features/media/types";
import type { CustomField } from "../types";

const CLEAR = "__clear__";

interface CustomFieldInputProps {
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  const id = `cf-${field.name}`;
  const str = typeof value === "string" ? value : value == null ? "" : String(value);

  switch (field.type) {
    case "text":
    case "email":
    case "url":
      return (
        <Input
          id={id}
          type={field.type === "text" ? "text" : field.type}
          value={str}
          placeholder={field.placeholder || (field.type === "url" ? "https://" : undefined)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "textarea":
      return <Textarea id={id} rows={4} value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "richtext":
      return <RichTextEditor compact value={str} onChange={onChange} placeholder={field.placeholder || "Write here…"} />;
    case "number":
      return (
        <Input
          id={id}
          type="number"
          step="any"
          className="max-w-xs"
          value={typeof value === "number" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "date":
      return <Input id={id} type="date" className="max-w-xs" value={str} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <Select value={str || undefined} onValueChange={(v) => onChange(v === CLEAR ? "" : v)}>
          <SelectTrigger id={id} className="max-w-sm">
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {!field.required && str && (
              <SelectItem value={CLEAR} className="text-muted-foreground">
                — None —
              </SelectItem>
            )}
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "toggle":
      return (
        <label className="flex items-center gap-3 text-sm">
          <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
          {value ? "Yes" : "No"}
        </label>
      );
    case "image":
      return (
        <div className="max-w-sm">
          <ImageInput value={(value as MediaRef | null) ?? null} onChange={onChange} showAlt />
        </div>
      );
    case "gallery":
      return <GalleryInput value={Array.isArray(value) ? (value as MediaRef[]) : []} onChange={onChange} />;
    case "file":
      return <FileInput value={(value as MediaRef | null) ?? null} onChange={onChange} />;
    default:
      return null;
  }
}
