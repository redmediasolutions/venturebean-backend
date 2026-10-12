"use client";

import { useCollection } from "@/hooks/use-collection";
import { mapMember, teamQuery } from "../repository/team-repository";

/** Live list of everyone with admin access. */
export function useTeam() {
  const { data, loading, error } = useCollection(teamQuery, mapMember);
  const members = [...data].sort(
    (a, b) => (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0) || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
  );
  return { members, loading, error };
}
