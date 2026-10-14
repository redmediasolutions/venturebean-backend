import "server-only";
import { str } from "./serialize";

/** Keep only the fields a field group is allowed to have. */
export function cleanFieldGroup(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if ("title" in body) out.title = str(body.title);
  if ("description" in body) out.description = str(body.description);
  if ("location" in body) out.location = body.location === "categories" ? "categories" : "all";
  if ("categoryIds" in body) out.categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(String) : [];
  if ("fields" in body) out.fields = Array.isArray(body.fields) ? body.fields : [];
  if ("active" in body) out.active = body.active !== false;
  if ("order" in body) out.order = typeof body.order === "number" ? body.order : 0;
  return out;
}
