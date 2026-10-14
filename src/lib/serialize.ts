import "server-only";

/**
 * Turn Firestore data into plain JSON for API responses
 * (Timestamps → ISO strings). Same approach as app/api/posts.
 */
export function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (typeof item.toDate === "function" && typeof item.seconds === "number") {
      return (item.toDate as () => Date)().toISOString();
    }
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(item)) {
      if (typeof nested === "function") continue;
      result[key] = serializeValue(nested);
    }
    return result;
  }
  return value;
}

export function serializeDoc(id: string, data: Record<string, unknown> | undefined): Record<string, unknown> & { id: string } {
  return { ...(serializeValue(data ?? {}) as Record<string, unknown>), id };
}

/** Read a JSON body that must be an object. Returns null when it isn't. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
