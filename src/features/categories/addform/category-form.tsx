"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { slugify } from "@/lib/slugify";
import { getErrorMessage } from "@/lib/format";
import { descendantIds, type CategoryWithDepth } from "../lib/category-tree";
import { saveCategoryChanges, saveNewCategory } from "../services/category-service";
import type { Category, CategoryInput } from "../types";

const NO_PARENT = "__none__";

interface CategoryFormProps {
  /** Pass a category to edit it; leave empty to create a new one. */
  category?: Category;
  categories: Category[];
  tree: CategoryWithDepth[];
  onSaved?: () => void;
  submitLabel?: string;
}

export function CategoryForm({ category, categories, tree, onSaved, submitLabel }: CategoryFormProps) {
  const [values, setValues] = useState<CategoryInput>({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    parentId: category?.parentId ?? null,
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [saving, setSaving] = useState(false);

  const blocked = category ? descendantIds(categories, category.id) : new Set<string>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (category) {
        await saveCategoryChanges(category.id, values, categories);
        toast.success("Category updated");
      } else {
        await saveNewCategory(values, categories);
        toast.success(`Category “${values.name}” added`);
        setValues({ name: "", slug: "", description: "", parentId: null });
        setSlugTouched(false);
      }
      onSaved?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Name" htmlFor="cat-name" required help="The name is how it appears on your website.">
        <Input
          id="cat-name"
          value={values.name}
          onChange={(e) =>
            setValues((v) => ({ ...v, name: e.target.value, slug: slugTouched ? v.slug : slugify(e.target.value) }))
          }
          placeholder="e.g. Blog, News, Events"
          required
        />
      </FormField>

      <FormField label="Slug" htmlFor="cat-slug" help="The URL-friendly version of the name. Lowercase, letters, numbers and hyphens.">
        <Input
          id="cat-slug"
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setValues((v) => ({ ...v, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }));
          }}
          onBlur={() => setValues((v) => ({ ...v, slug: slugify(v.slug) }))}
          placeholder="blog"
          className="font-mono text-[13px]"
        />
      </FormField>

      <FormField label="Parent category" help="Optional. Use this to make a sub-category.">
        <Select
          value={values.parentId ?? NO_PARENT}
          onValueChange={(v) => setValues((s) => ({ ...s, parentId: v === NO_PARENT ? null : v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PARENT}>None (top level)</SelectItem>
            {tree
              .filter((c) => !blocked.has(c.id))
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {"— ".repeat(c.depth)}
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Description" htmlFor="cat-desc" help="Optional. Some website designs show this on the category page.">
        <Textarea
          id="cat-desc"
          rows={3}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </FormField>

      <Button type="submit" disabled={saving || !values.name.trim()}>
        {saving && <Loader2 className="animate-spin" />}
        {submitLabel ?? (category ? "Save changes" : "Add category")}
      </Button>
    </form>
  );
}
