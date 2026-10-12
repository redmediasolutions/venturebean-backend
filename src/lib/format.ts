export function formatDate(date: Date | null | undefined, withTime = false): string {
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Value for <input type="datetime-local"> from a Date. */
export function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Remove HTML tags — used to show a plain-text preview of post content. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: string }).code);
    const friendly: Record<string, string> = {
      "auth/invalid-credential": "Wrong email or password.",
      "auth/invalid-email": "That email address doesn't look right.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/too-many-requests": "Too many attempts. Please wait a minute and try again.",
      "auth/network-request-failed": "No internet connection.",
      "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/missing-password": "Please enter a password.",
      "auth/operation-not-allowed":
        "Email/Password sign-in is turned off. Turn it on in Firebase Console → Authentication → Sign-in method.",
      "auth/admin-restricted-operation":
        "Creating accounts is turned off in Firebase. Turn on “Enable create (sign-up)” in Firebase Console → Authentication → Settings → User actions.",
      "permission-denied": "You don't have permission to do this. Is your account added as an admin?",
      "storage/unauthorized": "You don't have permission to upload files.",
    };
    if (friendly[code]) return friendly[code];
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
