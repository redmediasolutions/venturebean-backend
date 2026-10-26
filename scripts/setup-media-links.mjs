// One-time setup for the Knowledge Hub pages on the website.
//
//   node scripts/setup-media-links.mjs          (preview, changes nothing)
//   node scripts/setup-media-links.mjs --apply  (make the changes)
//
// 1. Lists your categories, so you can check the slugs the website expects:
//    media-spotlight, videos, industry-perspectives, framework.
// 2. Adds a "Link" custom field (link_url) to posts in Media Spotlight and
//    Videos: where each card opens (press article, PDF or YouTube video).
// 3. Fills that field on the imported posts with the links from the live
//    WordPress site (matched by WordPress post ID). Links you already set
//    are never overwritten.
//
// Uses the admin keys in .env.local. Safe to run more than once.
import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');

/** WordPress post ID → link, copied from the live Media Spotlight page. */
const LINKS = {
  24246: "https://startuptimes.net/venturebean-consulting-building-growth-stories-with-purpose-and-discipline", // media-spotlight,
  24273: "https://x.com/StartupTimes2/status/1996496240515952685/photo/1", // media-spotlight,
  24277: "https://globally24.com/venturebean-consulting-building-growth-stories-with-purpose-and-discipline", // media-spotlight,
  24279: "https://www.inc91.com/venturebean-consulting-building-growth-stories-with-purpose-and-discipline", // media-spotlight,
  24286: "https://www.theindustryoutlook.com/services-and-consulting/cover-story/venturebean-consulting-growth-and-transformation-of-businesses-and-people-through-customised-solutions-cid-3840.html", // media-spotlight,
  24289: "https://www.theindustryoutlook.com/services-and-consulting/ranking/top-10-business-consultants-2022-rid-364.html", // media-spotlight,
  24292: "https://economictimes.indiatimes.com/small-biz/startups/consultancies-like-ey-pwc-kpmg-form-teams-to-guide-startup-founders/articleshow/48062020.cms", // media-spotlight,
  24568: "https://youtu.be/U8CczZNN-KM?si=HpjK-gr4DCH-nyrM", // videos,
  24571: "https://youtu.be/Yp-1lFz40qU?si=sjX240carRWTf-jo", // videos,
  24578: "https://youtu.be/i1pzMRoEdKQ?si=94v6sb7Xnd96UrBh", // videos,
  24582: "https://youtu.be/oab186H_bbs?si=UHEjUuzCfyWIwPGC", // videos,
  24765: "https://www.youtube.com/watch?v=13AZOw8D3zc", // videos,
  24768: "https://www.youtube.com/watch?v=yvOQcvfmJdk", // videos,
  25141: "https://youtu.be/e9X252be8ds", // videos,
  25643: "https://youtu.be/NH8_KcZAYow", // videos,
  25646: "https://youtu.be/iAFY92qJwrY", // videos,
  26030: "/assets/uploads/2026/06/Mathew-Isac-Leadership-Spotlight-Post_20May26.pdf", // media-spotlight,
  26899: "https://www.youtube.com/watch?si=nthBCYl7TVgq7u8j&v=OvfZXfjzijM&feature=youtu.be", // videos
};

// ---- read .env.local (KEY=value lines; values may be quoted)
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}
if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing in .env.local');
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)) }, 'setup-media-links'));

// ---- 1. categories
const cats = (await db.collection('categories').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const posts = (await db.collection('posts').get()).docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
console.log('\nCategories (slug — name — posts):');
for (const c of cats.sort((a, b) => String(a.slug).localeCompare(String(b.slug)))) {
  const n = posts.filter((p) => (p.categoryIds || []).includes(c.id)).length;
  console.log(`  ${String(c.slug).padEnd(28)} ${String(c.name).padEnd(28)} ${n}`);
}
const bySlug = (s) => cats.find((c) => c.slug === s);
const needed = ['media-spotlight', 'videos', 'industry-perspectives', 'framework'];
const missing = needed.filter((s) => !bySlug(s));
if (missing.length) console.log(`\n  ⚠ Not found: ${missing.join(', ')} — the website looks for these slugs (see src/lib/posts.ts there).`);

// ---- 2. "Link" field group
const linkCats = ['media-spotlight', 'videos'].map(bySlug).filter(Boolean);
const groups = (await db.collection('fieldGroups').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const existing = groups.find((g) => (g.fields || []).some((f) => f.name === 'link_url'));
if (existing) {
  console.log(`\nField group "${existing.title}" with link_url already exists — leaving it.`);
} else {
  console.log(`\nWill add field group "Card link" (link_url) for: ${linkCats.map((c) => c.name).join(', ') || '(no matching categories)'}`);
  if (APPLY && linkCats.length) {
    const now = FieldValue.serverTimestamp();
    await db.collection('fieldGroups').add({
      title: 'Card link',
      description: 'Where this card opens on the Media Spotlight page.',
      location: 'categories',
      categoryIds: linkCats.map((c) => c.id),
      fields: [
        {
          id: 'link_url',
          label: 'Link',
          name: 'link_url',
          type: 'url',
          required: false,
          instructions: 'The press article, PDF or YouTube video this card opens. Leave empty to open the post itself.',
          placeholder: 'https://',
          options: [],
        },
      ],
      active: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    console.log('  added.');
  }
}

// ---- 3. fill links on imported posts
let set = 0, kept = 0;
const unmatched = new Set(Object.keys(LINKS));
for (const p of posts) {
  const url = LINKS[p.wordpressId];
  if (!url) continue;
  unmatched.delete(String(p.wordpressId));
  if (p.customFields?.link_url) { kept++; continue; }
  console.log(`  link  ${String(p.title).slice(0, 60).padEnd(60)} → ${url}`);
  if (APPLY) await p.ref.update({ 'customFields.link_url': url, updatedAt: FieldValue.serverTimestamp() });
  set++;
}
console.log(`\nLinks: ${set} ${APPLY ? 'set' : 'to set'}, ${kept} already had one, ${unmatched.size} WordPress posts not imported yet${unmatched.size ? ` (${[...unmatched].join(', ')})` : ''}.`);
if (!APPLY) console.log('\nPreview only. Run again with --apply to make these changes.\n');
