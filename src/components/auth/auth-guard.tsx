"use client";

/**
 * Wraps every admin page. Sends visitors to /login if they are not
 * signed in, and blocks signed-in accounts that are not admins.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { isFirebaseConfigured } from "@/firebase/config";
import { SetupRequired } from "./setup-required";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isFirebaseConfigured && !loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (!isFirebaseConfigured) return <SetupRequired />;
  if (loading || !user) return <FullScreenLoader />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
              <ShieldAlert className="size-5" />
            </div>
            <CardTitle className="text-xl">This account is not an admin yet</CardTitle>
            <CardDescription>
              You are signed in as <span className="font-medium text-foreground">{user.email}</span>, but this account
              hasn&apos;t been given admin access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>Open Firebase Console → Firestore Database.</li>
              <li>
                Create a collection called <code className="rounded bg-muted px-1 font-mono text-foreground">admins</code>.
              </li>
              <li>Add a document whose <b>Document ID</b> is the user ID below (add any field, e.g. name).</li>
              <li>Come back and refresh this page.</li>
            </ol>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2 pl-3">
              <code className="flex-1 truncate font-mono text-xs">{user.uid}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(user.uid);
                  toast.success("User ID copied");
                }}
              >
                <Copy /> Copy
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>I&apos;ve done it — refresh</Button>
              <Button variant="outline" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
