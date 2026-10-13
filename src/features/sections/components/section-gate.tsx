"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useSections } from "../hooks/use-sections";
import { findSection, type Section } from "../lib/sections";

/** Looks up the section from the URL and waits until its category exists. */
export function SectionGate({ children }: { children: (section: Section, categoryId: string) => React.ReactNode }) {
  const { section: slug } = useParams<{ section: string }>();
  const section = findSection(slug);
  const { categoryIds } = useSections();

  if (!section) {
    return (
      <EmptyState
        icon={FileX}
        title="Section not found"
        action={
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }
  const categoryId = categoryIds[section.slug];
  if (!categoryId) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children(section, categoryId)}</>;
}
