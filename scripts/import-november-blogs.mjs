// November 2026 blogs → Content Manager (Insights: Coaching / Consulting).
//
//   node scripts/import-november-blogs.mjs          (preview, changes nothing)
//   node scripts/import-november-blogs.mjs --apply  (upload images + save the posts)
//
// Reads scripts/data/november-2026-blogs.json (article text converted from the
// Word documents). For each blog it:
//   - copies the featured image (free Unsplash photo) to Amazon S3 and adds it
//     to the Media Library,
//   - creates the post in its category, published with its date at 10:00 AM IST
//     (future dates are scheduled: the website shows them from that date on its
//     next build).
// A post that already exists with the same slug (e.g. one started by hand) is
// updated instead of duplicated. Safe to run again.
import fs from 'node:fs';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const DATA = path.join(path.dirname(new URL(import.meta.url).pathname), 'data', 'november-2026-blogs.json');
const PUBLISH_TIME = 'T10:00:00+05:30'; // 10:00 AM India time
const AUTHOR = { authorId: 'U0C9ar5qhkTUpkDAIKRTMvhAylB2', authorName: 'sujay@redmediasolutions.in' };
const IMAGE_SIZE = { width: 1600, height: 1000 };

// ---- .env.local
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}
for (const k of ['FIREBASE_SERVICE_ACCOUNT_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
  if (!env[k]) throw new Error(`${k} missing in .env.local`);
}
const BUCKET = env.AWS_S3_BUCKET || 'redmediaassets';
const REGION = env.AWS_REGION || 'ap-south-1';
const BASE = (env.AWS_S3_PUBLIC_BASE_URL || `https://${BUCKET}.s3.${REGION}.amazonaws.com`).replace(/\/+$/, '');
const s3 = new S3Client({ region: REGION, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } });
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)) }, 'import-november-blogs'));
const publicUrl = (key) => `${BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;

const blogs = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const cats = (await db.collection('categories').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const posts = (await db.collection('posts').get()).docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

/** Copy the Unsplash photo to S3 (once) and add it to the Media Library. */
async function featuredImage(blog) {
  const name = `${blog.slug}.jpg`;
  const key = `venturebean/posts/${blog.slug}/${name}`;
  let size = 0;
  const head = await fetch(publicUrl(key), { method: 'HEAD' });
  if (head.ok) size = Number(head.headers.get('content-length') || 0);
  else {
    const src = `${blog.image.url}?w=${IMAGE_SIZE.width}&h=${IMAGE_SIZE.height}&fit=crop&crop=faces,entropy&q=80&fm=jpg`;
    const res = await fetch(src);
    if (!res.ok) throw new Error(`image download failed (${res.status})`);
    const body = Buffer.from(await res.arrayBuffer());
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    size = body.length;
  }
  const media = { name, url: publicUrl(key), path: key, storage: 's3', contentType: 'image/jpeg', size, alt: blog.image.alt, ...IMAGE_SIZE, uploadedBy: AUTHOR.authorId, source: blog.image.credit };
  const existing = (await db.collection('media').where('path', '==', key).limit(1).get()).docs[0];
  const id = existing ? existing.id : (await db.collection('media').add({ ...media, createdAt: FieldValue.serverTimestamp() })).id;
  return { id, url: media.url, path: key, name, alt: blog.image.alt, contentType: 'image/jpeg', ...IMAGE_SIZE };
}

console.log(`\n${blogs.length} blogs:`);
let done = 0, failed = 0;
for (const blog of blogs) {
  const cat = cats.find((c) => c.slug === blog.category);
  const when = new Date(blog.date + PUBLISH_TIME);
  const existing = posts.find((p) => p.slug === blog.slug) ?? posts.find((p) => String(p.title).trim() === blog.title);
  const label = `${blog.date}  ${blog.category.padEnd(10)}  ${blog.title.slice(0, 62)}`;
  if (!cat) { failed++; console.log(`  ✗ ${label}\n      category "${blog.category}" not found`); continue; }
  const scheduled = when > new Date();
  console.log(`  ${existing ? 'update' : 'new   '}  ${label}  → ${scheduled ? 'scheduled' : 'published'}`);
  if (!APPLY) continue;
  try {
    const image = await featuredImage(blog);
    const data = {
      title: blog.title,
      slug: blog.slug,
      content: blog.html,
      excerpt: blog.excerpt,
      featuredImage: image,
      categoryIds: [cat.id],
      categorySlugs: [cat.slug],
      status: 'published',
      publishedAt: Timestamp.fromDate(when),
      seoTitle: blog.title,
      seoDescription: blog.seo,
      customFields: existing?.customFields ?? {},
      ...AUTHOR,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (existing) await existing.ref.update(data);
    else await db.collection('posts').add({ ...data, createdAt: FieldValue.serverTimestamp() });
    done++;
  } catch (e) {
    failed++;
    console.log(`      ✗ ${e.message}`);
  }
}
if (APPLY) console.log(`\n${done} saved, ${failed} problem(s).`);
else console.log('\nPreview only. Run again with --apply to save them.\n');
