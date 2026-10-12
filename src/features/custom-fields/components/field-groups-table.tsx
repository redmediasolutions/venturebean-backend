"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Blocks, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { getErrorMessage } from "@/lib/format";
import type { Category } from "@/features/categories/types";
import { deleteFieldGroup, updateFieldGroup } from "../repository/field-group-repository";
import type { FieldGroup } from "../types";

interface FieldGroupsTableProps {
  groups: FieldGroup[];
  categoriesById: Map<string, Category>;
  loading: boolean;
}

export function FieldGroupsTable({ groups, categoriesById, loading }: FieldGroupsTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<FieldGroup | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Blocks}
        title="No field groups yet"
        description="Field groups add extra boxes to your posts — like “Event date” or “Price” — just like ACF in WordPress."
        action={
          <Button asChild>
            <Link href="/custom-fields/new">
              <Plus /> Add field group
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Shown on</TableHead>
              <TableHead className="text-right">Fields</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id} className="cursor-pointer" onClick={() => router.push(`/custom-fields/${g.id}`)}>
                <TableCell>
                  <p className="font-medium">{g.title}</p>
                  {g.description && <p className="max-w-md truncate text-xs text-muted-foreground">{g.description}</p>}
                </TableCell>
                <TableCell>
                  {g.location === "all" ? (
                    <Badge variant="secondary">All posts</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {g.categoryIds.map((id) => (
                        <Badge key={id} variant="outline">
                          {categoriesById.get(id)?.name ?? "Deleted category"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{g.fields.length}</TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={g.active}
                    onCheckedChange={async (active) => {
                      try {
                        await updateFieldGroup(g.id, { active });
                      } catch (err) {
                        toast.error(getErrorMessage(err));
                      }
                    }}
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/custom-fields/${g.id}`}>
                          <Pencil /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(g)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="The boxes will disappear from the post screen. Values already saved on posts are kept, so nothing on your website breaks."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteFieldGroup(deleting.id);
            toast.success("Field group deleted");
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
