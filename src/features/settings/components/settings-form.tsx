"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { getErrorMessage } from "@/lib/format";
import { saveSettings } from "../repository/settings-repository";
import type { SiteSettings } from "../types";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [values, setValues] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(settings), [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings({
        siteName: values.siteName.trim(),
        siteUrl: values.siteUrl.trim().replace(/\/+$/, ""),
        postUrlPattern: values.postUrlPattern.trim() || "/blog/{slug}",
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Website</CardTitle>
          <CardDescription>Basic details about the website this admin panel manages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField label="Website name" help="Shown at the top of the sidebar.">
            <Input value={values.siteName} onChange={(e) => setValues({ ...values, siteName: e.target.value })} placeholder="My Website" />
          </FormField>
          <FormField label="Website address" help="Your live Astro site. Enables “View on website” links.">
            <Input
              type="url"
              value={values.siteUrl}
              onChange={(e) => setValues({ ...values, siteUrl: e.target.value })}
              placeholder="https://www.example.com"
            />
          </FormField>
          <FormField
            label="Post URL pattern"
            help="How post addresses look on your site. {slug} is replaced with the post slug."
            className="sm:col-span-2"
          >
            <Input
              value={values.postUrlPattern}
              onChange={(e) => setValues({ ...values, postUrlPattern: e.target.value })}
              placeholder="/blog/{slug}"
              className="max-w-sm font-mono text-[13px]"
            />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
