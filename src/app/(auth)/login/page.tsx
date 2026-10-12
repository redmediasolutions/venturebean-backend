"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { isFirebaseConfigured } from "@/firebase/config";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { RulesSetup } from "@/components/auth/rules-setup";
import { SetupRequired } from "@/components/auth/setup-required";
import { FullScreenLoader } from "@/components/auth/auth-guard";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { user, loading, access, setup } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);

  // Nobody has set up the CMS yet → start on "Create account".
  const activeMode: Mode = setup === "done" ? "signin" : mode ?? (setup === "needed" ? "signup" : "signin");
  const canSignUp = setup === "needed" || setup === "blocked";

  useEffect(() => {
    if (!loading && user && access !== "checking") router.replace("/dashboard");
  }, [loading, user, access, router]);

  if (!isFirebaseConfigured) return <SetupRequired />;
  // Keep the form on screen while signing in / creating the account, so errors stay visible.
  if (setup === null || (loading && !user) || (user && access !== "checking")) return <FullScreenLoader />;

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: brand panel (black) */}
      <div className="relative hidden flex-col justify-between bg-[#0a0a0a] p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-white text-sm font-bold text-black">C</div>
          <span className="font-semibold">Content Manager</span>
        </div>
        <div className="space-y-4">
          <p className="max-w-md text-3xl leading-tight font-semibold tracking-tight">
            Write, organise and publish your website content — all in one place.
          </p>
          <p className="max-w-md text-sm text-white/60">
            Posts, categories, custom fields and media. Everything you publish here appears on your website automatically.
          </p>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <p className="text-xs text-white/40">© {new Date().getFullYear()} · Admin access only</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">
          {setup === "blocked" && <RulesSetup />}

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {activeMode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeMode === "signup"
                ? "First time here? Create the owner account to start managing your website."
                : "Sign in with your email and password."}
            </p>
          </div>

          {canSignUp && (
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md py-1.5 text-muted-foreground transition-colors",
                    activeMode === m && "bg-background text-foreground shadow-sm"
                  )}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          )}

          {activeMode === "signup" ? <SignupForm /> : <LoginForm />}

          {setup === "done" && (
            <p className="text-center text-xs text-muted-foreground">
              Need an account? Ask your admin to add you in Settings → Team.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
