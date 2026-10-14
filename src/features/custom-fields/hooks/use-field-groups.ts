"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { FIELD_GROUPS_KEY, fetchFieldGroups } from "../repository/field-group-repository";
import type { FieldGroup } from "../types";

const EMPTY: FieldGroup[] = [];

/** All field groups. Refreshes everywhere after any change. */
export function useFieldGroups() {
  const { data, loading, error } = useApiResource(FIELD_GROUPS_KEY, fetchFieldGroups, EMPTY);
  return { groups: data, loading, error };
}
