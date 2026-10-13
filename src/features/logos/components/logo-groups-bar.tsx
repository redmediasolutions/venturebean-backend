"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Category } from "@/features/categories/types";
import { createGroup, removeGroup, renameGroup } from "../services/logo-service";
import type { LogoGroup } from "../types";

export const ALL_GROUPS = "all";
export const NO_GROUP = "none";

interface LogoGroupsBarProps {
  groups: LogoGroup[];
  total: number;
  ungrouped: number;
  value: string;
  onChange: (groupId: string) => void;
  rootId: string;
  categories: Category[];
}

/** "All · Manufacturing · Technology · + New group" — pick a group to filter the logos. */
export function LogoGroupsBar({ groups, total, ungrouped, value, onChange, rootId, categories }: LogoGroupsBarProps) {
  const [dialog, setDialog] = useState<{ mode: "new" | "rename"; group?: LogoGroup } | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<LogoGroup | null>(null);

  const open = (mode: "new" | "rename", group?: LogoGroup) => {
    setName(group?.name ?? "");
    setDialog({ mode, group });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dialog) return;
    setSaving(true);
    try {
      if (dialog.mode === "new") {
        const id = await createGroup(name, rootId, categories);
        toast.success(`Group “${name.trim()}” added`);
        onChange(id);
      } else if (dialog.group) {
        await renameGroup(dialog.group.id, name, rootId, categories);
        toast.success("Group renamed");
      }
      setDialog(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const chip = (id: string, label: string, count: number, group?: LogoGroup) => {
    const active = value === id;
    return (
      <div
        key={id}
        className={cn(
          "group/chip flex items-center rounded-full border text-sm transition-colors",
          active ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted"
        )}
      >
        <button type="button" onClick={() => onChange(id)} className={cn("py-1.5 pl-3.5 font-medium", group ? "pr-1" : "pr-3.5")}>
          {label} <span className={cn("ml-1 text-xs tabular-nums", active ? "opacity-70" : "text-muted-foreground")}>{count}</span>
        </button>
        {group && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${group.name} options`}
                className={cn("mr-1 rounded-full p-1", active ? "hover:bg-background/20" : "hover:bg-foreground/10")}
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => open("rename", group)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(group)}>
                <Trash2 /> Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chip(ALL_GROUPS, "All", total)}
      {groups.map((g) => chip(g.id, g.name, g.count, g))}
      {ungrouped > 0 && chip(NO_GROUP, "No group", ungrouped)}
      <Button variant="ghost" size="sm" className="rounded-full" onClick={() => open("new")}>
        <Plus /> New group
      </Button>

      <Dialog open={Boolean(dialog)} onOpenChange={(o) => !saving && !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "new" ? "New logo group" : "Rename group"}</DialogTitle>
            <DialogDescription>
              Groups appear as tabs on the Clients page, e.g. Manufacturing, Technology, Healthcare.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Manufacturing" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="animate-spin" />}
                {dialog?.mode === "new" ? "Add group" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete the group “${deleting?.name}”?`}
        description="The logos in it are NOT deleted — they'll just move to “No group”."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await removeGroup(deleting.id, categories);
            if (value === deleting.id) onChange(ALL_GROUPS);
            toast.success("Group deleted");
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </div>
  );
}
