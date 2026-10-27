// One-time move: all client logos → Amazon S3 (same bucket as Media uploads).
//
//   node scripts/move-logos-to-s3.mjs          (preview, changes nothing)
//   node scripts/move-logos-to-s3.mjs --apply  (copy to S3 and update the Content Manager)
//
// 1. Client logos in the Content Manager (posts in "Clients" and its
//    sub-categories) that are still on Firebase Storage are copied to
//    S3 → venturebean/logos/clients/…  The post and its Media Library entry
//    are then pointed at the S3 copy. The Firebase copy is left in place.
// 2. The logos saved from WordPress (the website's fallback, used when the
//    Content Manager has no clients) are copied from the website project to
//    S3 → venturebean/logos/<year>/<month>/<file>. The website already points
//    at these addresses.
//
// Uses the Firebase admin key and AWS keys in .env.local. Safe to run again:
// logos already on S3 are skipped.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const SITE = process.argv.find((a) => a.startsWith('--site='))?.slice(7) || '../venturebean-astro';

// ---- .env.local
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}
const BUCKET = env.AWS_S3_BUCKET || 'redmediaassets';
const REGION = env.AWS_REGION || 'ap-south-1';
const BASE = (env.AWS_S3_PUBLIC_BASE_URL || `https://${BUCKET}.s3.${REGION}.amazonaws.com`).replace(/\/+$/, '');
for (const k of ['FIREBASE_SERVICE_ACCOUNT_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
  if (!env[k]) throw new Error(`${k} missing in .env.local`);
}
const s3 = new S3Client({
  region: REGION,
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
});
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)) }, 'move-logos'));

const publicUrl = (key) => `${BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
const isS3 = (url) => typeof url === 'string' && url.startsWith(BASE + '/');
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif' };
const typeOf = (name, fallback) => TYPES[name.split('.').pop().toLowerCase()] || fallback || 'application/octet-stream';
const safe = (name) => {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return `${base || 'logo'}${ext ? '.' + ext : ''}`;
};

async function put(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' })
  );
  // Make sure the website can actually load it.
  const res = await fetch(publicUrl(key), { method: 'HEAD' });
  if (!res.ok) throw new Error(`uploaded, but ${publicUrl(key)} answers ${res.status} — is the bucket public?`);
  return publicUrl(key);
}

let failed = 0;

// ---------------------------------------------------------------- 1. Content Manager
const cats = (await db.collection('categories').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const root = cats.find((c) => c.slug === 'clients');
const tree = new Set(root ? [root.id] : []);
for (let grew = true; grew; ) {
  grew = false;
  for (const c of cats) if (c.parentId && tree.has(c.parentId) && !tree.has(c.id)) tree.add(c.id), (grew = true);
}
const posts = (await db.collection('posts').get()).docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
const logos = posts.filter((p) => (p.categoryIds || []).some((id) => tree.has(id)) && p.featuredImage?.url);
const toMove = logos.filter((p) => !isS3(p.featuredImage.url));
console.log(`\nContent Manager: ${logos.length} client logos, ${logos.length - toMove.length} already on S3, ${toMove.length} to move.`);
if (!root) console.log('  ⚠ No category with slug "clients" found.');

const movedUrls = new Map(); // old url → new url (logos shared by several posts are copied once)
for (const p of toMove) {
  const img = p.featuredImage;
  const label = String(p.title || p.id).slice(0, 40).padEnd(40);
  try {
    let url = movedUrls.get(img.url);
    if (!url) {
      const name = safe(img.name || decodeURIComponent(new URL(img.url).pathname.split('/').pop()).split('/').pop());
      const key = `venturebean/logos/clients/${crypto.createHash('sha1').update(img.url).digest('hex').slice(0, 8)}-${name}`;
      if (APPLY) {
        const res = await fetch(img.url);
        if (!res.ok) throw new Error(`download failed (${res.status})`);
        const body = Buffer.from(await res.arrayBuffer());
        url = await put(key, body, img.contentType || res.headers.get('content-type') || typeOf(name));
      } else url = publicUrl(key);
      movedUrls.set(img.url, url);
    }
    const key = decodeURIComponent(new URL(url).pathname.slice(1));
    console.log(`  ${APPLY ? 'moved' : 'move '} ${label} → ${url}`);
    if (APPLY) {
      await p.ref.update({
        'featuredImage.url': url,
        'featuredImage.path': key,
        'featuredImage.storage': 's3',
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (img.id) {
        const media = db.collection('media').doc(img.id);
        const snap = await media.get();
        if (snap.exists && !isS3(snap.data().url)) {
          await media.update({ url, path: key, storage: 's3', firebasePath: snap.data().path ?? null });
        }
      }
    }
  } catch (e) {
    failed++;
    console.log(`  ✗ ${label} ${e.message}`);
  }
}

// ---------------------------------------------------------------- 2. Saved WordPress logos
const savedDir = path.join(SITE, 'src/components/client-logos/saved');
if (!fs.existsSync(savedDir)) {
  console.log(`\nSaved logos: website project not found at ${SITE} (use --site=/path/to/venturebean-astro). Skipped.`);
} else {
  const files = new Set();
  for (const f of fs.readdirSync(savedDir)) {
    const text = fs.readFileSync(path.join(savedDir, f), 'utf8');
    for (const m of text.matchAll(/(?:\/assets\/uploads\/|\/venturebean\/logos\/)(\d{4}\/\d{2}\/[^"'\s?#]+)/g)) files.add(m[1]);
  }
  console.log(`\nSaved WordPress logos: ${files.size} files → ${BASE}/venturebean/logos/…`);
  let up = 0, had = 0;
  for (const rel of [...files].sort()) {
    const key = `venturebean/logos/${rel}`;
    const local = path.join(SITE, 'public/assets/uploads', rel);
    try {
      const exists = await fetch(publicUrl(key), { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
      if (exists) { had++; continue; }
      if (!fs.existsSync(local)) throw new Error(`not found: ${local}`);
      if (APPLY) await put(key, fs.readFileSync(local), typeOf(rel));
      up++;
    } catch (e) {
      failed++;
      console.log(`  ✗ ${rel} ${e.message}`);
    }
  }
  console.log(`  ${up} ${APPLY ? 'uploaded' : 'to upload'}, ${had} already on S3.`);
}

console.log(failed ? `\n${failed} problem(s) — see ✗ above.` : '\nNo problems.');
if (!APPLY) console.log('Preview only. Run again with --apply to make these changes.\n');
