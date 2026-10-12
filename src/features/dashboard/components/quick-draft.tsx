"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/format";
import { savePost } from "@/features/posts/services/post-service";
import type { Category } from "@/features/categories/types";

/** Like WordPress "Quick Draft" — jot down an idea without leaving the dashboard. */
export function QuickDraft({ categories }: { categories: Category[] }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await savePost(
        {
          title,
          slug: "",
          content: content
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
            .join(""),
          excerpt: "",
          featuredImage: null,
          categoryIds: [],
          status: "draft",
          publishedAt: null,
          seoTitle: "",
          seoDescription: "",
          customFields: {},
          authorId: user?.uid ?? "",
          authorName: user?.displayName || user?.email || "",
        },
        categories
      );
      setTitle("");
      setContent("");
      toast.success("Draft saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick draft</CardTitle>
        <CardDescription>Save an idea now, finish it later.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="What's on your mind?" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          <Button type="submit" variant="outline" disabled={saving || !title.trim()}>
            {saving && <Loader2 className="animate-spin" />} Save draft
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
