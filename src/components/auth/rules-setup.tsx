"use client";

import { Check, Copy, ExternalLink, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { firebaseProjectId } from "@/firebase/config";
import { FIRESTORE_RULES, STORAGE_RULES } from "@/firebase/security-rules";
import { cn } from "@/lib/utils";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check /> : <Copy />} {copied ? "Copied" : `Copy ${label}`}
    </Button>
  );
}

/**
 * Shown when Firestore says "permission denied" — i.e. the security rules
 * that come with this project haven't been published to Firebase yet.
 */
export function RulesSetup({ className }: { className?: string }) {
  const consoleUrl = `https://console.firebase.google.com/project/${firebaseProjectId}`;
  return (
    <div className={cn("space-y-4 rounded-xl border bg-card p-5 text-sm", className)}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">One-time step: publish the security rules</p>
          <p className="text-muted-foreground">
            Firebase is blocking the app because your database is still using its default “deny everything” rules.
            Paste the rules below once — it takes a minute.
          </p>
        </div>
      </div>

      <ol className="space-y-3 pl-1">
        <li className="space-y-2">
          <p>
            <span className="font-medium">1. Firestore rules</span>{" "}
            <span className="text-muted-foreground">— copy, open the Rules tab, replace everything, click Publish.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={FIRESTORE_RULES} label="Firestore rules" />
            <Button size="sm" variant="ghost" asChild>
              <a href={`${consoleUrl}/firestore/databases/-default-/rules`} target="_blank" rel="noreferrer">
                Open Firestore Rules <ExternalLink />
              </a>
            </Button>
          </div>
        </li>
        <li className="space-y-2">
          <p>
            <span className="font-medium">2. Storage rules</span>{" "}
            <span className="text-muted-foreground">— same again, for image uploads.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={STORAGE_RULES} label="Storage rules" />
            <Button size="sm" variant="ghost" asChild>
              <a href={`${consoleUrl}/storage/rules`} target="_blank" rel="noreferrer">
                Open Storage Rules <ExternalLink />
              </a>
            </Button>
          </div>
        </li>
        <li>
          <span className="font-medium">3. Refresh this page.</span>
        </li>
      </ol>
    </div>
  );
}
