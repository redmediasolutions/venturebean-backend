/**
 * Adding a team member:
 *  1. Create their login (email + password) in Firebase Authentication,
 *     using a separate temporary app so YOU stay signed in.
 *  2. Add them to the "admins" collection so they get access.
 */
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { withSecondaryAuth } from "@/firebase/config";
import { addAdminRecord, removeAdminRecord } from "../repository/team-repository";
import type { NewMemberInput, TeamMember } from "../types";

export async function addTeamMember(input: NewMemberInput, addedBy: string) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");

  const uid = await withSecondaryAuth(async (auth) => {
    const cred = await createUserWithEmailAndPassword(auth, email, input.password);
    if (name) await updateProfile(cred.user, { displayName: name });
    return cred.user.uid;
  });

  await addAdminRecord(uid, { name, email, addedBy });
  return uid;
}

export async function removeTeamMember(member: TeamMember, currentUid: string) {
  if (member.uid === currentUid) throw new Error("You can't remove yourself.");
  if (member.role === "owner") throw new Error("The owner can't be removed.");
  await removeAdminRecord(member.uid);
}
