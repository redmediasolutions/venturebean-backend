"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/forms/form-field";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageInput } from "@/features/media/components/media-inputs";
import type { Category } from "@/features/categories/types";
import { DEFAULT_LOGO_SIZE } from "../lib/logo-utils";
import { removeLogo, updateLogo } from "../services/logo-service";
import { LogoGroupSelect } from "./logo-group-select";
import type { Logo, LogoGroup, LogoInput } from "../types";

interface EditLogoDialogProps {
  logo: Logo | null;
  onClose: () => void;
  groups: LogoGroup[];
  rootId: string;
  categories: Category[];
}

export function EditLogoDialog({ logo, onClose, ...rest }: EditLogoDialogProps) {
  return (
    <Dialog open={Boolean(logo)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">{logo && <EditLogoForm key={logo.id} logo={logo} onClose={onClose} {...rest} />}</DialogContent>
    </Dialog>
  );
}

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5 text-sm">
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{help}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function EditLogoForm({ logo, onClose, groups, rootId, categories }: Omit<EditLogoDialogProps, "logo"> & { logo: Logo }) {
  const [values, setValues] = useState<LogoInput>({
    name: logo.name,
    image: logo.image,
    groupId: logo.groupId,
    order: logo.order,
    size: logo.size,
    onHome: logo.onHome,
    onClientsPage: logo.onClientsPage,
    published: logo.published,
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<LogoInput>) => setValues((v) => ({ ...v, ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateLogo(logo, values, rootId, categories);
      toast.success("Logo saved");
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <DialogHeader className="mb-5">
        <DialogTitle>Edit logo</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          <ImageInput value={values.image} onChange={(image) => set({ image })} contain />
        </div>
        <div className="space-y-4">
          <FormField label="Client name" htmlFor="logo-name" help="Also used as the image description for Google.">
            <Input id="logo-name" value={values.name} onChange={(e) => set({ name: e.target.value })} />
          </FormField>
          <FormField label="Group" htmlFor="logo-group">
            <LogoGroupSelect id="logo-group" groups={groups} value={values.groupId} onChange={(groupId) => set({ groupId })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Order" htmlFor="logo-order" help="Lower shows first.">
              <Input
                id="logo-order"
                type="number"
                value={values.order ?? ""}
                onChange={(e) => set({ order: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Size (%)" htmlFor="logo-size" help={`Normal is ${DEFAULT_LOGO_SIZE}.`}>
              <Input
                id="logo-size"
                type="number"
                min={10}
                max={100}
                placeholder={String(DEFAULT_LOGO_SIZE)}
                value={values.size ?? ""}
                onChange={(e) => set({ size: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </FormField>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Toggle label="Visible" help="Off = hidden everywhere" checked={values.published} onChange={(published) => set({ published })} />
        <Toggle label="Home page" help="In the scrolling strip" checked={values.onHome} onChange={(onHome) => set({ onHome })} />
        <Toggle label="Clients page" help="In the logo grid" checked={values.onClientsPage} onChange={(onClientsPage) => set({ onClientsPage })} />
      </div>
      <DialogFooter className="mt-6 sm:justify-between">
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Delete
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save
          </Button>
        </div>
      </DialogFooter>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${logo.name}”?`}
        description="It will be removed from the website. The image stays in your Media library."
        onConfirm={async () => {
          try {
            await removeLogo(logo);
            toast.success("Logo deleted");
            onClose();
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </form>
  );
}
