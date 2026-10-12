"use client";

import { useState } from "react";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firebaseProjectId } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { getErrorMessage } from "@/lib/format";
import { useSiteSettings } from "@/features/settings/hooks/use-site-settings";
import { SettingsForm } from "@/features/settings/components/settings-form";

export default function SettingsPage() {
  const { user, resetPassword } = useAuth();
  const { settings, loading } = useSiteSettings();
  const [sending, setSending] = useState(false);

  const snippet = `// In your Astro project → src/lib/cms.ts (see astro-integration folder)
const posts = await getPosts({ category: "blog" });
const post  = await getPostBySlug("my-first-post");
post.customFields.event_date; // your custom fields`;

  return (
    <>
      <PageHeader title="Settings" description="Website details, your account, and how to connect your Astro site." />
      <div className="grid max-w-4xl gap-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <SettingsForm settings={settings} />
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Your account</CardTitle>
            <CardDescription>Admin accounts are managed in Firebase Console → Authentication.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="text-muted-foreground">Signed in as</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              disabled={sending}
              onClick={async () => {
                if (!user?.email) return;
                setSending(true);
                try {
                  await resetPassword(user.email);
                  toast.success("Password reset email sent");
                } catch (err) {
                  toast.error(getErrorMessage(err));
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? <Loader2 className="animate-spin" /> : <KeyRound />} Change password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Connect your Astro website</CardTitle>
            <CardDescription>
              Your site reads content directly from Firebase. Follow README.md → “Connect your Astro site”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Firebase project</dt>
              <dd className="flex items-center gap-2 font-mono text-[13px]">
                {firebaseProjectId}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(firebaseProjectId);
                    toast.success("Copied");
                  }}
                  aria-label="Copy project ID"
                >
                  <Copy className="size-3.5" />
                </Button>
              </dd>
              <dt className="text-muted-foreground">Collections</dt>
              <dd className="font-mono text-[13px]">
                {COLLECTIONS.posts}, {COLLECTIONS.categories}, {COLLECTIONS.media}
              </dd>
            </dl>
            <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
