"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getErrorMessage } from "@/lib/format";
import { useLogos } from "@/features/logos/hooks/use-logos";
import { ensureLogosRoot, moveLogo } from "@/features/logos/services/logo-service";
import { ALL_GROUPS, LogoGroupsBar, NO_GROUP } from "@/features/logos/components/logo-groups-bar";
import { LogoGrid } from "@/features/logos/components/logo-grid";
import { EditLogoDialog } from "@/features/logos/components/edit-logo-dialog";
import { AddLogosDialog } from "@/features/logos/addform/add-logos-dialog";

export default function LogosPage() {
  const { root, groups, logos, categories, loading } = useLogos();
  const [group, setGroup] = useState(ALL_GROUPS);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const creatingRoot = useRef(false);

  // First visit: create the "Clients" category that holds all logos.
  useEffect(() => {
    if (loading || root || creatingRoot.current) return;
    creatingRoot.current = true;
    ensureLogosRoot(categories).catch((err) => toast.error(getErrorMessage(err)));
  }, [loading, root, categories]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logos
      .filter((l) => group === ALL_GROUPS || (group === NO_GROUP ? !l.groupId : l.groupId === group))
      .filter((l) => !q || l.name.toLowerCase().includes(q));
  }, [logos, group, search]);

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? null;
  const editing = logos.find((l) => l.id === editingId) ?? null;
  const currentGroup = groups.find((g) => g.id === group) ?? null;

  return (
    <>
      <PageHeader
        title="Logos"
        description="Client logos on your website. Each group becomes a tab on the Clients page."
        actions={
          root && <AddLogosDialog groups={groups} defaultGroupId={currentGroup?.id ?? null} rootId={root.id} categories={categories} logos={logos} />
        }
      />

      {loading || !root ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3]" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <LogoGroupsBar
              groups={groups}
              total={logos.length}
              ungrouped={logos.filter((l) => !l.groupId).length}
              value={group}
              onChange={setGroup}
              rootId={root.id}
              categories={categories}
            />
            <div className="relative shrink-0 lg:w-60">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search logos…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Award}
              title={logos.length === 0 ? "No logos yet" : search ? "No logos match your search" : "No logos in this group yet"}
              description={logos.length === 0 ? "Click “Add logos” to upload your clients' logos. Create groups like Manufacturing or Technology to organise them." : undefined}
            />
          ) : (
            <LogoGrid
              logos={visible}
              groupName={groupName}
              showGroup={group === ALL_GROUPS}
              onOpen={(l) => setEditingId(l.id)}
              onMove={async (l, dir) => {
                try {
                  await moveLogo(logos, visible, l, dir);
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Tip: hover a logo and use the arrows to change the order. Changes appear on the website after it&apos;s rebuilt.
          </p>
        </div>
      )}

      {root && <EditLogoDialog logo={editing} onClose={() => setEditingId(null)} groups={groups} rootId={root.id} categories={categories} />}
    </>
  );
}
