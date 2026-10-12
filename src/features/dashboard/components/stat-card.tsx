import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  loading?: boolean;
}

export function StatCard({ label, value, icon: Icon, href, loading }: StatCardProps) {
  return (
    <Link href={href} className="group">
      <Card className="py-4 transition-colors group-hover:border-foreground/30">
        <CardContent className="flex items-center justify-between px-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>}
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
