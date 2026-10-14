"use client";

import { useMemo } from "react";
import { useApiResource } from "@/hooks/use-api-resource";
import { fetchTeam, TEAM_KEY } from "../repository/team-repository";
import type { TeamMember } from "../types";

const EMPTY: TeamMember[] = [];

/** Everyone with admin access (owner first). */
export function useTeam() {
  const { data, loading, error } = useApiResource(TEAM_KEY, fetchTeam, EMPTY);
  const members = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0) ||
          (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
      ),
    [data]
  );
  return { members, loading, error };
}
