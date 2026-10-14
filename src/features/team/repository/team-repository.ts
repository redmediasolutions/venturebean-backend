/** Team (admins) — read and changed through /api/team. */
import { apiDelete, apiGet, apiPost, toDate } from "@/lib/api-client";
import { invalidate } from "@/hooks/use-api-resource";
import type { NewMemberInput, TeamMember } from "../types";

export const TEAM_KEY = "team";

export function mapMember(raw: Record<string, unknown>): TeamMember {
  return {
    uid: String(raw.id),
    name: String(raw.name ?? raw.displayName ?? ""),
    email: String(raw.email ?? ""),
    role: raw.role === "owner" ? "owner" : "admin",
    createdAt: toDate(raw.createdAt),
  };
}

export async function fetchTeam(): Promise<TeamMember[]> {
  const { members } = await apiGet<{ members: Record<string, unknown>[] }>("/api/team");
  return (members ?? []).map(mapMember);
}

/** Creates the member's login and gives them admin access (on the server). */
export async function addMember(input: NewMemberInput): Promise<string> {
  const { uid } = await apiPost<{ uid: string }>("/api/team", input);
  invalidate(TEAM_KEY);
  return uid;
}

export async function removeMember(uid: string) {
  await apiDelete(`/api/team/${encodeURIComponent(uid)}`);
  invalidate(TEAM_KEY);
}
