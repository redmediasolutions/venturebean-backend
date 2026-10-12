"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useFieldGroups } from "@/features/custom-fields/hooks/use-field-groups";
import { FieldGroupsTable } from "@/features/custom-fields/components/field-groups-table";
import { useCategories } from "@/features/categories/hooks/use-categories";

export default function CustomFieldsPage() {
  const { groups, loading } = useFieldGroups();
  const { byId } = useCategories();

  return (
    <>
      <PageHeader
        title="Custom Fields"
        description="Add extra fields to your posts (like ACF in WordPress). Show them on all posts or only on certain categories."
        actions={
          <Button asChild>
            <Link href="/custom-fields/new">
              <Plus /> Add field group
            </Link>
          </Button>
        }
      />
      <FieldGroupsTable groups={groups} categoriesById={byId} loading={loading} />
    </>
  );
}
