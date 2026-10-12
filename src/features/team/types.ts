/** Someone who can sign in to the admin panel (a document in the "admins" collection). */
export interface TeamMember {
  /** Their Firebase user ID (also the document ID). */
  uid: string;
  name: string;
  email: string;
  /** "owner" = the person who set up the CMS. Both roles have full access. */
  role: "owner" | "admin";
  createdAt: Date | null;
}

export interface NewMemberInput {
  name: string;
  email: string;
  password: string;
}
