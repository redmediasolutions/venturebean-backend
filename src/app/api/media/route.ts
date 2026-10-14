import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { serializeDoc } from "@/lib/serialize";
import { safeFileName, uploadToS3 } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA = "media";
const MAX_BYTES = 20 * 1024 * 1024;

/** GET /api/media — Media Library, newest first. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  try {
    const snapshot = await adminDb().collection(MEDIA).get();
    const media = snapshot.docs
      .map((d) => serializeDoc(d.id, d.data()))
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return NextResponse.json({ media });
  } catch (error) {
    console.error("Failed to fetch media:", error);
    return NextResponse.json({ error: "Failed to fetch media." }, { status: 500 });
  }
}

/**
 * POST /api/media — upload a file (multipart form: file, width?, height?).
 * The file goes to S3 (same bucket as the WordPress importer) and is
 * added to the Media Library.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Please upload a file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please upload a file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 20 MB or smaller." }, { status: 413 });
  }

  const contentType = file.type || "application/octet-stream";
  const now = new Date();
  const key = `venturebean/media/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Date.now()}-${safeFileName(file.name)}`;
  const num = (v: FormDataEntryValue | null) => (v && /^\d+$/.test(String(v)) ? Number(v) : null);

  try {
    const url = await uploadToS3(key, Buffer.from(await file.arrayBuffer()), contentType);
    const record = {
      name: file.name,
      url,
      path: key,
      storage: "s3",
      contentType,
      size: file.size,
      alt: "",
      width: num(form.get("width")),
      height: num(form.get("height")),
      uploadedBy: auth.uid,
    };
    const ref = await adminDb().collection(MEDIA).add({ ...record, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ media: { ...record, id: ref.id, createdAt: now.toISOString() } }, { status: 201 });
  } catch (error) {
    const e = error as { name?: string; message?: string };
    console.error("[Media Upload] Failed", { key, name: e.name, message: e.message });
    return NextResponse.json({ error: "Upload failed. Check the S3 settings in .env.local." }, { status: 500 });
  }
}
