// Deletes the duplicate copy of "What Leaders Discover About Themselves Only in a
// Crisis" (added on Nov 6, address …-crisis-2). The original post stays.
//   node scripts/delete-duplicate-nov5.mjs
import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const db = getFirestore(initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)) }, 'delete-duplicate'));

const ref = db.collection('posts').doc('4HdldBRCnWB6E7zKt6q4');
const snap = await ref.get();
if (!snap.exists) {
  console.log('Already deleted.');
} else if (snap.data().slug !== 'what-leaders-discover-about-themselves-only-in-a-crisis-2') {
  console.log(`Stopped: this post is "${snap.data().title}" (${snap.data().slug}), not the duplicate.`);
} else {
  await ref.delete();
  console.log('Deleted the duplicate. The original (…-only-in-a-crisis) is untouched.');
}
