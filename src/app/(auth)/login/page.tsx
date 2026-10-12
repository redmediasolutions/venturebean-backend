"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { isFirebaseConfigured } from "@/firebase/config";
import { LoginForm } from "@/components/auth/login-form";
import { SetupRequired } from "@/components/auth/setup-required";
import { FullScreenLoader } from "@/components/auth/auth-guard";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (!isFirebaseConfigured) return <SetupRequired />;
  if (loading || user) return <FullScreenLoader />;

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
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in with your admin email and password.</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
