"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { SetupRequired } from "./setup-required";
import { RulesSetup } from "./rules-setup";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    access,
    setup,
    loading,
    signOut,
    recheckAccess,
  } = useAuth();

  const router = useRouter();
  const [checking, setChecking] = useState(false);

  // Redirect visitors without a valid server session to the login page.
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const handleRecheck = useCallback(async () => {
    setChecking(true);

    try {
      await recheckAccess();
    } catch (error) {
      console.error("Failed to recheck admin access:", error);
    } finally {
      setChecking(false);
    }
  }, [recheckAccess]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  }, [signOut, router]);

  if (loading || !user) {
    return <FullScreenLoader />;
  }

  if (access === "admin") {
    return <>{children}</>;
  }

  if (setup === "needed") {
    return <SetupRequired />;
  }

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

              <CardTitle className="text-xl">
                You don&apos;t have access yet
              </CardTitle>

              <CardDescription>
                You&apos;re signed in as{" "}
                <span className="font-medium text-foreground">
                  {user.email ?? "an authenticated user"}
                </span>
                . Ask the website owner to add you in{" "}
                <span className="font-medium text-foreground">
                  Settings → Team
                </span>
                .
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Server authentication</p>
                <p className="mt-1 text-muted-foreground">
                  Your session is checked by the Next.js server. If you
                  recently received access, check again.
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                User ID:{" "}
                <code className="break-all font-mono">{user.uid}</code>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button onClick={handleRecheck} disabled={checking || loading}>
            {checking && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Check again
          </Button>

          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
