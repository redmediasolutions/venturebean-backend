// One-time setup for "Download the full analysis" on Industry Perspectives.
//
//   node scripts/setup-report-downloads.mjs          (preview, changes nothing)
//   node scripts/setup-report-downloads.mjs --apply  (make the changes)
//
// 1. Adds a "Report download" field group (report_pdf, a PDF file) to posts in
//    Industry Perspectives. When a post has a PDF, the website shows the email
//    form; the emails appear in Content Manager → Report downloads.
// 2. Copies each report's PDF from WordPress to Amazon S3, adds it to the
//    Media Library and attaches it to the imported post (matched by WordPress
//    post ID, or slug). PDFs you already attached are never replaced.
//
// Uses the keys in .env.local. Safe to run more than once.
import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const WP = 'https://venturebean.com/wp-content/uploads/';

/** WordPress post → its report PDF (from the WordPress Media Library). */
const REPORTS = [
  { wp: 27742, slug: 'india-gcc-workplace-reset', pdf: '2026/09/India_GCC_Workplace_Reset_VentureBean_Analysis.pdf' },
  { wp: 25909, slug: 'india-skills-report-2025', pdf: '2026/08/20_India_Skills_Report_2025_VentureBean.pdf' },
  { wp: 25834, slug: 'india-gcc-landscape-report-the-5-yearjourney-2025', pdf: '2026/08/12_Nasscom_GCC_Landscape_VentureBean.pdf' },
  { wp: 25785, slug: 'annual-survey-of-msmes-in-india-2025-the-role-of-digitalisation', pdf: '2026/04/03_ICRIER_MSME_Digitalisation_VentureBean.pdf' },
  { wp: 25518, slug: 'understanding-indian-msme-sector-progress-and-challenges', pdf: '2026/04/01_SIDBI_MSME_Report_VentureBean.pdf' },
  { wp: 25520, slug: 'global-leadership-forecast-2025', pdf: '2026/04/05_DDI_Global_Leadership_Forecast_VentureBean.pdf' },
  { wp: 25522, slug: 'citrini-2028-global-intelligence-crisis', pdf: '2026/04/23_Citrini_2028_Global_Intelligence_Crisis_VentureBean-1-1.pdf' },
];

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
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)) }, 'setup-report-downloads'));
const publicUrl = (key) => `${BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;

// ---- 1. field group
const cats = (await db.collection('categories').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const ip = cats.filter((c) => ['industry-perspectives', 'industry-perspective'].includes(c.slug));
if (!ip.length) console.log('\n⚠ No "industry-perspectives" category found — the field group will apply to all posts.');
const groups = (await db.collection('fieldGroups').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const existing = groups.find((g) => (g.fields || []).some((f) => f.name === 'report_pdf'));
if (existing) {
  console.log(`\nField group "${existing.title}" with report_pdf already exists — leaving it.`);
} else {
  console.log(`\n${APPLY ? 'Adding' : 'Will add'} field group "Report download" (report_pdf) for: ${ip.map((c) => c.name).join(', ') || 'all posts'}`);
  if (APPLY) {
    const now = FieldValue.serverTimestamp();
    await db.collection('fieldGroups').add({
      title: 'Report download',
      description: 'The full report people can download from this article after entering their email.',
      location: ip.length ? 'categories' : 'all',
      categoryIds: ip.map((c) => c.id),
      fields: [
        {
          id: 'report_pdf',
          label: 'Report PDF',
          name: 'report_pdf',
          type: 'file',
          required: false,
          instructions:
            'Upload the PDF. The article then shows “Download the full analysis”: visitors enter their email to get it, and the emails appear under Report downloads. Leave empty for no download.',
          placeholder: '',
          options: [],
        },
      ],
      active: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ---- 2. attach PDFs
const posts = (await db.collection('posts').get()).docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
let attached = 0, kept = 0, missing = 0, failed = 0;
console.log('\nReports:');
for (const r of REPORTS) {
  const post = posts.find((p) => p.wordpressId === r.wp) ?? posts.find((p) => p.slug === r.slug);
  const label = (post?.title ?? r.slug).slice(0, 60).padEnd(60);
  if (!post) { missing++; console.log(`  –  ${label} not imported yet (WordPress post ${r.wp})`); continue; }
  if (post.customFields?.report_pdf?.url) { kept++; console.log(`  ✓  ${label} already has a PDF`); continue; }
  const name = r.pdf.split('/').pop();
  const key = `venturebean/reports/${name}`;
  try {
    if (APPLY) {
      let size = 0;
      const head = await fetch(publicUrl(key), { method: 'HEAD' });
      if (head.ok) size = Number(head.headers.get('content-length') || 0);
      else {
        const res = await fetch(WP + r.pdf);
        if (!res.ok) throw new Error(`download from WordPress failed (${res.status})`);
        const body = Buffer.from(await res.arrayBuffer());
        if (body.subarray(0, 4).toString('ascii') !== '%PDF') throw new Error('WordPress did not return a PDF');
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: 'application/pdf', CacheControl: 'public, max-age=31536000, immutable' }));
        size = body.length;
      }
      const media = { name, url: publicUrl(key), path: key, storage: 's3', contentType: 'application/pdf', size, alt: post.title ?? '', width: null, height: null, uploadedBy: 'import' };
      const mediaRef = await db.collection('media').add({ ...media, createdAt: FieldValue.serverTimestamp() });
      await post.ref.update({
        'customFields.report_pdf': { id: mediaRef.id, url: media.url, path: key, name, alt: media.alt, contentType: 'application/pdf' },
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    attached++;
    console.log(`  +  ${label} ${APPLY ? '' : 'will get '}${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗  ${label} ${e.message}`);
  }
}
console.log(`\n${attached} ${APPLY ? 'attached' : 'to attach'}, ${kept} already had one, ${missing} not imported, ${failed} problem(s).`);
if (!APPLY) console.log('Preview only. Run again with --apply to make these changes.\n');
