"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Blocks, ChevronDown, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toFieldName } from "@/lib/slugify";
import { getErrorMessage } from "@/lib/format";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { EmptyState } from "@/components/empty-state";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { CategoryChecklist } from "@/features/categories/components/category-checklist";
import { FIELD_TYPE_ORDER, FIELD_TYPES, newField } from "../lib/field-types";
import { saveFieldGroup } from "../services/field-group-service";
import type { CustomField, FieldGroup, FieldGroupInput } from "../types";

interface FieldGroupFormProps {
  group?: FieldGroup;
  allGroups: FieldGroup[];
}

export function FieldGroupForm({ group, allGroups }: FieldGroupFormProps) {
  const router = useRouter();
  const { tree, loading: categoriesLoading } = useCategories();
  const [values, setValues] = useState<FieldGroupInput>(() => ({
    title: group?.title ?? "",
    description: group?.description ?? "",
    location: group?.location ?? "all",
    categoryIds: group?.categoryIds ?? [],
    fields: group?.fields ?? [],
    active: group?.active ?? true,
    order: group?.order ?? allGroups.length,
  }));
  const [openFieldId, setOpenFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);

  const set = (patch: Partial<FieldGroupInput>) => {
    setValues((v) => ({ ...v, ...patch }));
    setDirty(true);
  };

  const updateField = (id: string, patch: Partial<CustomField>) =>
    set({ fields: values.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  const moveField = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= values.fields.length) return;
    const fields = [...values.fields];
    [fields[index], fields[to]] = [fields[to], fields[index]];
    set({ fields });
  };

  function addField() {
    const f = newField();
    set({ fields: [...values.fields, f] });
    setOpenFieldId(f.id);
  }

  function duplicateField(f: CustomField) {
    const copy = { ...newField(), ...f, id: newField().id, label: `${f.label} (copy)`, name: `${f.name}_copy` };
    set({ fields: [...values.fields, copy] });
    setOpenFieldId(copy.id);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const id = await saveFieldGroup(values, allGroups, group?.id);
      setDirty(false);
      toast.success(group ? "Field group updated" : "Field group created");
      if (!group) router.replace(`/custom-fields/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* ---------- Main column ---------- */}
      <div className="min-w-0 space-y-6">
        <Card>
          <CardContent className="space-y-5">
            <FormField label="Group title" htmlFor="fg-title" required help="Shown as the box title on the post screen, e.g. “Event Details”.">
              <Input
                id="fg-title"
                value={values.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Event Details"
                className="h-10 text-base"
              />
            </FormField>
            <FormField label="Description" htmlFor="fg-desc" help="Optional note for editors.">
              <Input id="fg-desc" value={values.description} onChange={(e) => set({ description: e.target.value })} />
            </FormField>
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0">
          <CardHeader className="border-b">
            <CardTitle>Fields</CardTitle>
            <CardDescription>Add the extra boxes editors should fill in. Drag order with the arrows.</CardDescription>
          </CardHeader>

          {values.fields.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Blocks}
                title="No fields yet"
                description="Click “Add field” to create your first one."
                action={
                  <Button onClick={addField}>
                    <Plus /> Add field
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y">
              {values.fields.map((field, i) => {
                const open = openFieldId === field.id;
                const TypeIcon = FIELD_TYPES[field.type].icon;
                return (
                  <li key={field.id} className={cn(open && "bg-muted/30")}>
                    <div className="flex items-center gap-3 px-5 py-3">
                      <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setOpenFieldId(open ? null : field.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <TypeIcon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {field.label || <span className="text-muted-foreground">(no label)</span>}
                            {field.required && <span className="ml-0.5 text-destructive">*</span>}
                          </p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {field.name || toFieldName(field.label) || "field_name"}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-auto hidden sm:inline-flex">
                          {FIELD_TYPES[field.type].label}
                        </Badge>
                        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                      </button>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon-sm" onClick={() => moveField(i, -1)} disabled={i === 0} aria-label="Move up">
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => moveField(i, 1)}
                          disabled={i === values.fields.length - 1}
                          aria-label="Move down"
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    </div>

                    {open && (
                      <div className="space-y-5 border-t bg-background px-5 py-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField label="Field label" required help="What editors see, e.g. “Event date”.">
                            <Input
                              autoFocus
                              value={field.label}
                              onChange={(e) => {
                                const label = e.target.value;
                                const autoName = !field.name || field.name === toFieldName(field.label);
                                updateField(field.id, { label, ...(autoName ? { name: toFieldName(label) } : {}) });
                              }}
                            />
                          </FormField>
                          <FormField label="Field name" required help="Used in your Astro code. Lowercase and underscores only.">
                            <Input
                              value={field.name}
                              onChange={(e) => updateField(field.id, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                              className="font-mono text-[13px]"
                            />
                          </FormField>
                          <FormField label="Field type">
                            <Select value={field.type} onValueChange={(t) => updateField(field.id, { type: t as CustomField["type"] })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPE_ORDER.map((t) => {
                                  const Icon = FIELD_TYPES[t].icon;
                                  return (
                                    <SelectItem key={t} value={t}>
                                      <Icon className="size-4 text-muted-foreground" />
                                      {FIELD_TYPES[t].label}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">{FIELD_TYPES[field.type].description}</p>
                          </FormField>
                          <div className="space-y-2">
                            <Label>Required?</Label>
                            <label className="flex h-9 items-center gap-3 text-sm">
                              <Switch checked={field.required} onCheckedChange={(required) => updateField(field.id, { required })} />
                              {field.required ? "Yes — must be filled before publishing" : "No — optional"}
                            </label>
                          </div>
                        </div>

                        {field.type === "select" && (
                          <FormField label="Choices" required help="One choice per line.">
                            <Textarea
                              rows={4}
                              value={field.options.join("\n")}
                              onChange={(e) => updateField(field.id, { options: e.target.value.split("\n") })}
                              placeholder={"Small\nMedium\nLarge"}
                            />
                          </FormField>
                        )}

                        <div className="grid gap-5 sm:grid-cols-2">
                          <FormField label="Instructions" help="Help text shown under the field.">
                            <Input value={field.instructions} onChange={(e) => updateField(field.id, { instructions: e.target.value })} />
                          </FormField>
                          {["text", "textarea", "number", "email", "url"].includes(field.type) && (
                            <FormField label="Placeholder" help="Grey example text inside the empty box.">
                              <Input value={field.placeholder} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} />
                            </FormField>
                          )}
                        </div>

                        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => duplicateField(field)}>
                              <Copy /> Duplicate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => set({ fields: values.fields.filter((f) => f.id !== field.id) })}
                            >
                              <Trash2 /> Delete field
                            </Button>
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => setOpenFieldId(null)}>
                            Close field
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {values.fields.length > 0 && (
            <div className="border-t px-5 py-4">
              <Button variant="outline" onClick={addField}>
                <Plus /> Add field
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* ---------- Right sidebar ---------- */}
      <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Save</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Turn off to hide this box from posts.</span>
              </span>
              <Switch checked={values.active} onCheckedChange={(active) => set({ active })} />
            </label>
            <FormField label="Order" help="Lower numbers show first on the post screen.">
              <Input type="number" value={values.order} onChange={(e) => set({ order: Number(e.target.value) || 0 })} className="w-24" />
            </FormField>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {group ? "Save changes" : "Create field group"}
            </Button>
            {dirty && <p className="text-center text-xs text-muted-foreground">You have unsaved changes</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Choose which posts show these fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Show this group on">
              <Select value={values.location} onValueChange={(l) => set({ location: l as FieldGroupInput["location"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All posts</SelectItem>
                  <SelectItem value="categories">Posts in these categories…</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {values.location === "categories" && (
              <div className="rounded-md border p-2">
                <CategoryChecklist tree={tree} loading={categoriesLoading} value={values.categoryIds} onChange={(categoryIds) => set({ categoryIds })} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
