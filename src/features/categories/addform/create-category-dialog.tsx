"use client";

/** "Create category" dialog from the Posts screen. */
import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Category, CategoryInput } from "../types";

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  order: number;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  createCategory: (input: CategoryInput) => Promise<string>;
  /** Called with the new category once it's saved. */
  onCreated?: (category: { id: string; name: string; slug: string }) => void;
}

export function CreateCategoryDialog({ open, onOpenChange, categories, createCategory, onCreated }: CreateCategoryDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CategoryFormData>({ name: "", slug: "", description: "", order: categories.length + 1 });

  function updateField<K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (next) {
      setError("");
      setForm({ name: "", slug: "", description: "", order: categories.length + 1 });
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name) return setError("Please enter a category name.");
    if (!slug) return setError("Please enter a valid category name or slug.");
    if (categories.some((c) => c.slug?.toLowerCase() === slug.toLowerCase())) {
      return setError("A category with this slug already exists. Please choose another slug.");
    }
    if (!Number.isInteger(form.order) || form.order < 1) return setError("Display order must be a positive whole number.");

    setSaving(true);
    try {
      const id = await createCategory({ name, slug, description: form.description.trim(), parentId: null });
      onOpenChange(false);
      onCreated?.({ id, name, slug });
    } catch (err) {
      console.error("Failed to create category:", err);
      setError(err instanceof Error ? err.message : "Unable to create the category. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create category</DialogTitle>
            <DialogDescription>
              Create a category to organize VentureBean articles. It appears in the sidebar under Posts.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                placeholder="Leadership & Executive Coaching"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value, slug: slugify(e.target.value) }))}
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-slug">URL slug</Label>
              <Input
                id="category-slug"
                placeholder="leadership-coaching"
                value={form.slug}
                onChange={(e) => updateField("slug", slugify(e.target.value))}
                disabled={saving}
                required
              />
              <p className="text-xs text-muted-foreground">Admin URL: /posts/{form.slug || "category-slug"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                placeholder="Describe the articles that belong in this category."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                disabled={saving}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-order">Display order</Label>
              <Input
                id="category-order"
                type="number"
                min={1}
                step={1}
                value={form.order}
                onChange={(e) => updateField("order", Number(e.target.value))}
                disabled={saving}
                required
              />
              <p className="text-xs text-muted-foreground">Determines the order in which categories are displayed.</p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <FolderPlus />}
              {saving ? "Creating…" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
