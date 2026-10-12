"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useFieldGroups } from "@/features/custom-fields/hooks/use-field-groups";
import { FieldGroupForm } from "@/features/custom-fields/addform/field-group-form";

export default function NewFieldGroupPage() {
  const { groups, loading } = useFieldGroups();
  return (
    <>
      <Link href="/custom-fields" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All field groups
      </Link>
      <PageHeader title="Add field group" description="Create a set of extra fields for your posts." />
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <FieldGroupForm allGroups={groups} />
      )}
    </>
  );
}
