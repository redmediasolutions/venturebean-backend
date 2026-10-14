import "server-only";

/**
 * Amazon S3 uploads — same bucket and settings as the WordPress importer
 * (AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * optional AWS_S3_PUBLIC_BASE_URL in .env.local).
 */
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const S3_BUCKET = process.env.AWS_S3_BUCKET || "redmediaassets";
export const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
export const S3_PUBLIC_BASE_URL = (process.env.AWS_S3_PUBLIC_BASE_URL || `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`).replace(/\/+$/, "");

let client: S3Client | undefined;
function s3(): S3Client {
  client ??= new S3Client({
    region: AWS_REGION,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
        : undefined,
  });
  return client;
}

export function s3PublicUrl(key: string) {
  return `${S3_PUBLIC_BASE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadToS3(key: string, body: Buffer, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return s3PublicUrl(key);
}

export async function deleteFromS3(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

/** "My Photo (1).JPG" → "my-photo-1.jpg" */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "file"}${ext ? "." + ext : ""}`;
}
