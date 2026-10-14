/**
 * Adding a team member: the server creates their login (email + password)
 * and adds them to the "admins" collection.
 */
import { addMember, removeMember } from "../repository/team-repository";
import type { NewMemberInput, TeamMember } from "../types";

export async function addTeamMember(input: NewMemberInput, _addedBy?: string) {
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");
  return addMember({ name: input.name.trim(), email: input.email.trim().toLowerCase(), password: input.password });
}

export async function removeTeamMember(member: TeamMember, currentUid: string) {
  if (member.uid === currentUid) throw new Error("You can't remove yourself.");
  if (member.role === "owner") throw new Error("The owner can't be removed.");
  await removeMember(member.uid);
}
