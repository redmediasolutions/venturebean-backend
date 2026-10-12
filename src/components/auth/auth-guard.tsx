"use client";

/**
 * Wraps every admin page. Sends visitors to /login if they are not
 * signed in, and blocks signed-in accounts that are not admins.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { isFirebaseConfigured } from "@/firebase/config";
import { SetupRequired } from "./setup-required";
import { RulesSetup } from "./rules-setup";
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
  const { user, access, loading, signOut, recheckAccess } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isFirebaseConfigured && !loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (!isFirebaseConfigured) return <SetupRequired />;
  if (loading || !user) return <FullScreenLoader />;
  if (access === "admin") return <>{children}</>;

  const recheck = async () => {
    setChecking(true);
    await recheckAccess();
    setChecking(false);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-lg space-y-4">
        {access === "rules-blocked" ? (
          <RulesSetup />
        ) : (
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
                <ShieldAlert className="size-5" />
              </div>
              <CardTitle className="text-xl">You don&apos;t have access yet</CardTitle>
              <CardDescription>
                You&apos;re signed in as <span className="font-medium text-foreground">{user.email}</span>. Ask the
                website owner to add you in <span className="font-medium text-foreground">Settings → Team</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Your user ID: <code className="font-mono">{user.uid}</code>
            </CardContent>
          </Card>
        )}
        <div className="flex gap-2">
          <Button onClick={recheck} disabled={checking}>
            {checking && <Loader2 className="animate-spin" />} Check again
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
