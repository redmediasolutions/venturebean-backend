"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { getErrorMessage } from "@/lib/format";
import { addTeamMember } from "../services/team-service";

export function AddMemberDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addTeamMember(values, user?.uid ?? "");
      toast.success(`${values.name || values.email} can now sign in`, {
        description: "Share their email and password with them.",
      });
      setValues({ name: "", email: "", password: "" });
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus /> Add member
      </Button>
      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              They&apos;ll be able to sign in and manage all content. Share the password with them — they can change it
              later with “Forgot password”.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Name" htmlFor="tm-name">
              <Input id="tm-name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
            </FormField>
            <FormField label="Email" htmlFor="tm-email" required>
              <Input
                id="tm-email"
                type="email"
                required
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
              />
            </FormField>
            <FormField label="Password" htmlFor="tm-password" required help="At least 6 characters.">
              <Input
                id="tm-password"
                type="text"
                autoComplete="off"
                required
                minLength={6}
                value={values.password}
                onChange={(e) => setValues({ ...values, password: e.target.value })}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Add member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
