"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate, getErrorMessage } from "@/lib/format";
import { AddMemberDialog } from "../addform/add-member-dialog";
import { useTeam } from "../hooks/use-team";
import { removeTeamMember } from "../services/team-service";
import type { TeamMember } from "../types";

export function TeamCard() {
  const { user } = useAuth();
  const { members, loading } = useTeam();
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle>Team</CardTitle>
        <CardDescription>People who can sign in to this admin panel.</CardDescription>
        <CardAction>
          <AddMemberDialog />
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ul className="divide-y">
            {members.map((m) => {
              const label = m.name || m.email || m.uid;
              const isMe = m.uid === user?.uid;
              return (
                <li key={m.uid} className="flex items-center gap-3 px-5 py-3">
                  <Avatar>
                    <AvatarFallback>{label.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {label}
                      {isMe && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email || "—"} · added {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <Badge variant={m.role === "owner" ? "default" : "outline"}>{m.role === "owner" ? "Owner" : "Admin"}</Badge>
                  {!isMe && m.role !== "owner" ? (
                    <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(m)} aria-label={`Remove ${label}`}>
                      <Trash2 />
                    </Button>
                  ) : (
                    <span className="size-8" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name || removing?.email}?`}
        description="They won't be able to use the admin panel any more. Their posts stay as they are."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing || !user) return;
          try {
            await removeTeamMember(removing, user.uid);
            toast.success("Removed from team");
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </Card>
  );
}
