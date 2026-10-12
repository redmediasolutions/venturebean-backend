"use client";

import { useCollection } from "@/hooks/use-collection";
import { fieldGroupsQuery, mapFieldGroup } from "../repository/field-group-repository";

/** Live list of all field groups. */
export function useFieldGroups() {
  const { data, loading, error } = useCollection(fieldGroupsQuery, mapFieldGroup);
  return { groups: data, loading, error };
}
