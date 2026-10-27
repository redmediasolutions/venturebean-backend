// One-time import: all client logos from the website → Content Manager "Logos".
//
//   node scripts/import-logos.mjs          (preview, changes nothing)
//   node scripts/import-logos.mjs --apply  (upload to S3 and create the logos)
//
// For each client logo that was on the WordPress site (Clients page tabs +
// home page strip) this creates a logo in Content Manager → Logos:
//   name, short description, group (tab), position, size, Home / Clients page,
//   and the image uploaded to Amazon S3 (venturebean/logos/<year>/<month>/<file>).
// Groups (Consumer, Education, …) are created if missing.
//
// Safe to run again: logos that already exist (same name or same image) are skipped.
// Images are read from the website project (default ../venturebean-astro,
// change with --site=/path/to/venturebean-astro).
import fs from 'node:fs';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const SITE = process.argv.find((a) => a.startsWith('--site='))?.slice(7) || '../venturebean-astro';

const GROUPS = ['Consumer', 'Education', 'Health Care', 'Manufacturing & Infrastructure', 'Services', 'Technology'];

// In website order. file = path under public/assets/uploads/, size = width % (60 = normal),
// home = in the home page strip, clients = on the Clients page.
// prettier-ignore
const LOGOS = [
  { file: '2025/07/2.png', name: 'CaratLane', description: 'Jewellery brand, a Tanishq partnership', group: 'Consumer', home: true },
  { file: '2025/07/30.png', name: 'Titan Company', description: 'Watches, jewellery and eyewear (Tata Group)', group: 'Consumer' },
  { file: '2025/07/1.png', name: 'Zepto', description: 'Quick-commerce grocery delivery', group: 'Consumer', home: true },
  { file: '2025/08/rasapoorna_foods_private_limited_logo.jpeg', name: 'Rasapoorna Foods', description: 'Food products', group: 'Consumer' },
  { file: '2025/08/jgi-logo.jpeg', name: 'JGI Ventures', description: 'Nurturing ideas, powering success', group: 'Education', size: 61 },
  { file: '2025/08/inlingua-logo-svg-vector.svg', name: 'inlingua', description: 'Language training', group: 'Education' },
  { file: '2025/08/acecreative.png', name: 'Ace Creative Learning', description: 'Creative learning', group: 'Education' },
  { file: '2025/08/ants.jpg', name: 'ANTS Skill Varsity', description: 'Skill is power', group: 'Education' },
  { file: '2025/08/ipl.jpg', name: 'Institute of Product Leadership', description: 'Product management and leadership education', group: 'Education', size: 100 },
  { file: '2025/07/29.png', name: 'Mifamed Medical', description: 'Medical', group: 'Health Care' },
  { file: '2025/07/5.png', name: 'Teva', description: 'Pharmaceuticals', group: 'Health Care' },
  { file: '2025/07/3.png', name: 'GSK', description: 'Pharmaceuticals and healthcare', group: 'Health Care' },
  { file: '2025/08/Gunasheela-Logo_001-scaled-1.jpg', name: 'Gunasheela Fertility Centre', description: 'Fertility centre, since 1985', group: 'Health Care', home: true },
  { file: '2025/08/drucare.jpeg', name: 'DruCare', description: 'Healthcare', group: 'Health Care' },
  { file: '2025/08/indigene.png', name: 'Indegene', description: 'Life sciences commercialisation', group: 'Health Care' },
  { file: '2025/08/shatayu-ayurveda3-1-.png', name: 'Shatayu Ayurveda', description: 'Ayurvedic wellness', group: 'Health Care', size: 100 },
  { file: '2025/08/mi-labs-horamavu-bangalore-lab-management-services-swbwolyln6.jpg', name: 'Mi Labs', description: 'Essence of nature', group: 'Health Care', size: 100 },
  { file: '2025/08/primecare.png', name: 'Primecare', description: 'Good health matters', group: 'Health Care' },
  { file: '2025/08/heeraji.jpg', name: 'Heeraji', description: '', group: 'Health Care' },
  { file: '2025/08/toyota-brand-logo-car-symbol-with-name-black-design-japan-automobile-illustration-free-vector.jpg', name: 'Toyota', description: 'Automotive manufacturer', group: 'Health Care' },
  { file: '2025/08/bostik_logo.jpeg', name: 'Bostik', description: 'Adhesives', group: 'Health Care' },
  { file: '2025/08/Raenco-main.webp', name: 'Raenco', description: 'Crafting linen since 1996', group: 'Health Care' },
  { file: '2025/07/31.png', name: 'SKF', description: 'Bearings and engineering', group: 'Manufacturing & Infrastructure' },
  { file: '2025/07/33.png', name: 'Thales', description: 'Aerospace, defence and security', group: 'Manufacturing & Infrastructure' },
  { file: '2025/07/4.png', name: 'Avery Dennison', description: 'Labels and packaging materials', group: 'Manufacturing & Infrastructure', home: true },
  { file: '2025/07/6.png', name: 'Neolite', description: 'Automobile lighting', group: 'Manufacturing & Infrastructure', size: 62 },
  { file: '2025/07/22-e1755064584334.png', name: 'Huntsman', description: 'Enriching lives through innovation', group: 'Manufacturing & Infrastructure', size: 100, home: true },
  { file: '2025/07/36.png', name: 'JSW', description: 'Steel, energy and infrastructure', group: 'Manufacturing & Infrastructure' },
  { file: '2025/07/35.png', name: 'GMR', description: 'Airports, energy and infrastructure', group: 'Manufacturing & Infrastructure', home: true },
  { file: '2025/07/11.png', name: 'Solaer', description: 'Renewable energies', group: 'Manufacturing & Infrastructure' },
  { file: '2025/07/25-e1755064494928.png', name: 'Pennar Industries', description: 'Engineering and steel products', group: 'Manufacturing & Infrastructure', size: 84, home: true },
  { file: '2025/08/karnataka-roadlines-pvt-ltd-and-mahendra-roadlines-pvt-ltd-v-v-puram-bangalore-transporters-ysoxo.avif', name: 'Karnataka Roadlines', description: 'Transport and logistics', group: 'Manufacturing & Infrastructure', size: 89 },
  { file: '2025/08/concorde_group_logo.jpeg', name: 'Concorde Group', description: 'Real estate', group: 'Manufacturing & Infrastructure' },
  { file: '2025/08/usolar_clean_energy_solutions_logo.jpeg', name: 'U-Solar', description: 'Clean energy', group: 'Manufacturing & Infrastructure', size: 65 },
  { file: '2025/07/32.png', name: 'Wells Fargo', description: 'Financial services', group: 'Services' },
  { file: '2025/07/9.png', name: 'Stealth Startup', description: '', group: 'Services' },
  { file: '2025/07/10-e1787131509437.png', name: 'Hi Life', description: 'Luxury essentials', group: 'Services' },
  { file: '2025/07/12.png', name: 'Unnamed client (red logo)', description: '', group: 'Services', size: 61 },
  { file: '2025/07/13.png', name: 'Ararat RSL', description: '', group: 'Services' },
  { file: '2025/07/17.png', name: 'Chakos', description: 'Kitchen and bar', group: 'Services' },
  { file: '2025/07/18.png', name: 'Sine Qua Non', description: 'Enabling sustainable growth', group: 'Services' },
  { file: '2025/07/19-e1755064726396.png', name: 'Poiesis Marketing', description: 'Marketing', group: 'Services' },
  { file: '2025/07/20-e1755064671988.png', name: 'Slingshot Method', description: '', group: 'Services' },
  { file: '2025/07/21-e1755064607910.png', name: 'Oxyzo', description: 'Business financing', group: 'Services' },
  { file: '2025/07/23.png', name: 'Logicserve Digital', description: 'Digital marketing', group: 'Services', home: true },
  { file: '2025/07/26.png', name: 'Symphony SUMMIT', description: 'The intelligent ITSM platform', group: 'Services' },
  { file: '2025/08/floret.jpg', name: 'Floret', description: '', group: 'Services' },
  { file: '2025/08/address.avif', name: 'Address Health', description: 'Healthy children. Happy children.', group: 'Services' },
  { file: '2025/08/club.png', name: 'Club Concierge', description: 'Concierge services', group: 'Services' },
  { file: '2025/08/superseva-service-pvt-ltd-saidapet-chennai-airport-concierge-services-goefizudhw-250.webp', name: 'SuperSeva', description: 'Airport concierge services', group: 'Services' },
  { file: '2025/07/34-e1755064434930.png', name: 'CitiusTech', description: 'Healthcare technology', group: 'Technology' },
  { file: '2025/07/7.png', name: 'Blue Yonder', description: 'Supply chain software', group: 'Technology' },
  { file: '2026/08/WhatsApp-Image-2026-08-27-at-16.26.36.jpeg', name: 'Insight Consultants', description: '', group: 'Technology' },
  { file: '2025/07/28.png', name: 'Moolya', description: 'Software testing', group: 'Technology', home: true, homeFile: '2025/08/moolya.png' },
  { file: '2025/07/8.png', name: 'Informatica', description: 'Data management', group: 'Technology', home: true },
  { file: '2025/07/15.png', name: 'ReBIT', description: 'Reserve Bank Information Technology', group: 'Technology' },
  { file: '2025/07/27.png', name: 'Spirent', description: 'Promise. Assured.', group: 'Technology', home: true },
  { file: '2025/07/16.png', name: 'RTX', description: 'Aerospace and defence', group: 'Technology' },
  { file: '2025/07/14.png', name: 'Learn Automation', description: '', group: 'Technology' },
  { file: '2026/08/WhatsApp-Image-2026-08-27-at-16.37.23.jpeg', name: 'Sails Software', description: '', group: 'Technology' },
  { file: '2025/08/siemens.svg', name: 'Siemens', description: 'Technology company', group: 'Technology' },
  { file: '2025/08/qubix-logo.jpg', name: 'Qubix', description: 'Professional audio video', group: 'Technology', home: true },
  { file: '2025/08/ahana.jpg', name: 'Ahana', description: 'Creating possibilities', group: 'Technology' },
  { file: '2025/08/Zyxware_logo-scaled.png', name: 'Zyxware Technologies', description: 'Software development', group: 'Technology' },
  { file: '2025/08/PlayAblo-Website-Logo.webp', name: 'PlayAblo', description: 'Learning gamified', group: 'Technology' },
  { file: '2025/08/Carmatec-Logo-494x154-1-e1647412350853.png', name: 'Carmatec', description: 'IT services and software', group: 'Technology' },
  { file: '2025/08/skitre_logo_hd.png', name: 'Skitre', description: 'Skills training practice', group: 'Technology' },
  { file: '2025/08/code_brew_labs_app_developers_logo.jpeg', name: 'Code Brew Labs', description: 'App developers', group: 'Technology' },
  { file: '2025/08/cylops.jpg', name: 'Cyclops', description: '', group: 'Technology' },
  { file: '2025/07/24-e1755064540224.png', name: 'Insight', description: '', group: 'Technology' },
  { file: '2025/08/sail-new-logo.jpg', name: 'Sails Software (icon)', description: '', group: 'Technology' },
  // Home page strip only (not on the Clients page):
  { file: '2025/08/floating-walls.jpg', name: 'Floating Walls', description: 'Furnishing', group: null, home: true, clients: false },
  { file: '2025/08/sunder-manganese-and-iron-ore-ltd.png', name: 'Sandur Manganese & Iron Ores', description: 'Mining', group: null, home: true, clients: false },
  { file: '2025/08/desmet.jpeg', name: 'Desmet Ballestra', description: 'Process engineering', group: null, home: true, clients: false },
  { file: '2025/08/dreamfolks.png', name: 'DreamFolks', description: 'Airport services', group: null, home: true, clients: false },
  { file: '2025/08/acent.png', name: 'Ascent Décor', description: 'The finest fabric makers', group: null, home: true, clients: false },
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
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)) }, 'import-logos'));

const publicUrl = (key) => `${BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif' };
const typeOf = (name) => TYPES[name.split('.').pop().toLowerCase()] || 'application/octet-stream';
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const onS3 = (key) => fetch(publicUrl(key), { method: 'HEAD' }).then((r) => r.ok).catch(() => false);

/** Upload the image (unless it's already on S3) and return its S3 address. */
async function upload(file) {
  const key = `venturebean/logos/${file}`;
  if (await onS3(key)) return { key, url: publicUrl(key) };
  const local = path.join(SITE, 'public/assets/uploads', file);
  if (!fs.existsSync(local)) throw new Error(`image not found: ${local}`);
  if (APPLY) {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: fs.readFileSync(local), ContentType: typeOf(file), CacheControl: 'public, max-age=31536000, immutable' }));
    if (!(await onS3(key))) throw new Error(`uploaded, but ${publicUrl(key)} can't be loaded — is the bucket public?`);
  }
  return { key, url: publicUrl(key) };
}

// ---- categories: Clients + groups
const catSnap = await db.collection('categories').get();
const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
async function ensureCategory(name, parentId) {
  const slug = slugify(name);
  const found = cats.find((c) => c.slug === slug || (c.name === name && (c.parentId ?? null) === parentId));
  if (found) return found;
  console.log(`  ${APPLY ? 'create' : 'will create'} category “${name}”`);
  const data = { name, slug, description: '', parentId, image: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
  const id = APPLY ? (await db.collection('categories').add(data)).id : `(new:${slug})`;
  const c = { id, ...data };
  cats.push(c);
  return c;
}
console.log('\nGroups:');
const root = await ensureCategory('Clients', null);
const groupCat = {};
for (const g of GROUPS) groupCat[g] = await ensureCategory(g, root.id);

// ---- existing logos (to skip)
const tree = new Set([root.id, ...Object.values(groupCat).map((c) => c.id)]);
const posts = (await db.collection('posts').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const existing = posts.filter((p) => (p.categoryIds || []).some((id) => tree.has(id)));
const takenSlugs = new Set(posts.map((p) => p.slug));
const has = (l) =>
  existing.some(
    (p) => String(p.title).trim().toLowerCase() === l.name.toLowerCase() || p.featuredImage?.path === `venturebean/logos/${l.file}`
  );

// ---- import
console.log(`\nLogos (${LOGOS.length}):`);
let created = 0, skipped = 0, failed = 0;
for (const [i, l] of LOGOS.entries()) {
  const label = `${String(i + 1).padStart(2)}. ${l.name}`.padEnd(42);
  if (has(l)) { skipped++; console.log(`  skip   ${label} (already in Logos)`); continue; }
  try {
    const img = await upload(l.file);
    if (l.homeFile) await upload(l.homeFile); // keep the home-strip variant on S3 too
    const groupId = l.group ? groupCat[l.group].id : null;
    const categoryIds = groupId ? [root.id, groupId] : [root.id];
    let slug = `client-${slugify(l.name)}`;
    for (let n = 2; takenSlugs.has(slug); n++) slug = `client-${slugify(l.name)}-${n}`;
    takenSlugs.add(slug);
    const fileName = l.file.split('/').pop();
    if (APPLY) {
      const now = FieldValue.serverTimestamp();
      const media = { name: fileName, url: img.url, path: img.key, storage: 's3', contentType: typeOf(fileName), size: fs.statSync(path.join(SITE, 'public/assets/uploads', l.file)).size, alt: l.name, width: null, height: null, uploadedBy: 'import' };
      const mediaRef = await db.collection('media').add({ ...media, createdAt: now });
      await db.collection('posts').add({
        title: l.name,
        slug,
        content: '',
        excerpt: l.description,
        featuredImage: { id: mediaRef.id, url: img.url, path: img.key, name: fileName, alt: l.name, contentType: media.contentType, width: null, height: null, storage: 's3' },
        categoryIds,
        categorySlugs: categoryIds.map((id) => cats.find((c) => c.id === id)?.slug).filter(Boolean),
        status: 'published',
        publishedAt: new Date(),
        seoTitle: '',
        seoDescription: '',
        customFields: {
          display_order: i + 1,
          logo_size: l.size && l.size !== 60 ? l.size : null,
          hide_on_home: !l.home,
          hide_on_clients_page: l.clients === false,
        },
        authorId: 'import',
        authorName: 'Logo import',
        createdAt: now,
        updatedAt: now,
      });
    }
    created++;
    console.log(`  ${APPLY ? 'added ' : 'add   '} ${label} ${l.group ?? '(home strip only)'}`);
  } catch (e) {
    failed++;
    console.log(`  ✗      ${label} ${e.message}`);
  }
}
console.log(`\n${created} ${APPLY ? 'added' : 'to add'}, ${skipped} already there, ${failed} problem(s).`);
if (!APPLY) console.log('Preview only. Run again with --apply to make these changes.\n');
