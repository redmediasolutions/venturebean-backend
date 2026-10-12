"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CustomFieldInput } from "./custom-field-input";
import type { CustomFieldValues, FieldGroup } from "../types";

interface CustomFieldsPanelProps {
  groups: FieldGroup[];
  values: CustomFieldValues;
  onChange: (name: string, value: unknown) => void;
  errors?: Record<string, string>;
}

/** Shows every matching field group as a box on the post screen (like ACF). */
export function CustomFieldsPanel({ groups, values, onChange, errors = {} }: CustomFieldsPanelProps) {
  return (
    <>
      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="border-b">
            <CardTitle>{group.title}</CardTitle>
            {group.description && <CardDescription>{group.description}</CardDescription>}
            <CardAction>
              <Button variant="ghost" size="icon-sm" asChild aria-label="Edit field group">
                <Link href={`/custom-fields/${group.id}`} target="_blank">
                  <Settings2 className="text-muted-foreground" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-6">
            {group.fields.length === 0 && <p className="text-sm text-muted-foreground">This group has no fields yet.</p>}
            {group.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`cf-${field.name}`}>
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                <CustomFieldInput field={field} value={values[field.name]} onChange={(v) => onChange(field.name, v)} />
                {errors[field.name] ? (
                  <p className="text-xs text-destructive">{errors[field.name]}</p>
                ) : (
                  field.instructions && <p className="text-xs text-muted-foreground">{field.instructions}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
