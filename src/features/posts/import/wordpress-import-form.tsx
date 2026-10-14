"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WordPressImportFormProps {
  defaultCategoryId?: string;
}

export function WordPressImportForm({
  defaultCategoryId,
}: WordPressImportFormProps) {
  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(false);

  function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);

    // Firebase import integration will be implemented here.
    console.log("WordPress URL:", postUrl);
    console.log("Default category:", defaultCategoryId);

    setLoading(false);
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <form onSubmit={handleImport} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="wordpress-url">
            WordPress article URL
          </Label>

          <Input
            id="wordpress-url"
            type="url"
            placeholder="https://venturebean.com/article-slug/"
            value={postUrl}
            onChange={(event) => setPostUrl(event.target.value)}
            required
          />

          <p className="text-sm text-muted-foreground">
            Enter the URL of a published VentureBean article.
          </p>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Globe className="mr-2 size-4" />
          )}

          Import from WordPress
        </Button>
      </form>
    </div>
  );
}