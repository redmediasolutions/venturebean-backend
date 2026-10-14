/**
 * Calls the admin panel's own API routes (/api/...).
 * Authentication is the HTTP-only session cookie — same approach as
 * features/posts/repository/post-repository.ts.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (isObject(body)) {
        if (typeof body.error === "string") message = body.error;
        else if (typeof body.message === "string") message = body.message;
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiGet = <T>(url: string) => apiRequest<T>(url);
export const apiPost = <T>(url: string, body: unknown) => apiRequest<T>(url, { method: "POST", body: JSON.stringify(body) });
export const apiPatch = <T>(url: string, body: unknown) => apiRequest<T>(url, { method: "PATCH", body: JSON.stringify(body) });
export const apiPut = <T>(url: string, body: unknown) => apiRequest<T>(url, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = <T>(url: string) => apiRequest<T>(url, { method: "DELETE" });

/** Upload a file with progress (fetch can't report upload progress). */
export function apiUpload<T>(url: string, form: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const body = xhr.response as Record<string, unknown> | null;
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new Error((body && typeof body.error === "string" && body.error) || `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your internet connection."));
    xhr.send(form);
  });
}

/** ISO string / Date / Firestore-like timestamp → Date (or null). */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (isObject(value)) {
    const seconds = (value.seconds ?? value._seconds) as number | undefined;
    if (typeof seconds === "number") return new Date(seconds * 1000);
  }
  return null;
}
