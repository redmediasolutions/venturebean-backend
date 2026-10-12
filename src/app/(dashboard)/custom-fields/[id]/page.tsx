"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Blocks, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useFieldGroups } from "@/features/custom-fields/hooks/use-field-groups";
import { FieldGroupForm } from "@/features/custom-fields/addform/field-group-form";

export default function EditFieldGroupPage() {
  const { id } = useParams<{ id: string }>();
  const { groups, loading } = useFieldGroups();
  const group = groups.find((g) => g.id === id);

  return (
    <>
      <Link href="/custom-fields" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All field groups
      </Link>
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !group ? (
        <EmptyState
          icon={Blocks}
          title="Field group not found"
          action={
            <Button asChild>
              <Link href="/custom-fields">Back</Link>
            </Button>
          }
        />
      ) : (
        <>
          <PageHeader title="Edit field group" description={group.title} />
          {/* key: reload the form only when switching groups, not on every live update */}
          <FieldGroupForm key={group.id} group={group} allGroups={groups} />
        </>
      )}
    </>
  );
}
