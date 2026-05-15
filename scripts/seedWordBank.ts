import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface WordEntry {
  word: string;
  definition: string;
}

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT environment variable is required.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
});

const db = admin.firestore();
// Target the named Firestore database for this project
db.settings({ databaseId: 'ai-studio-ba922d2a-cccb-45d3-ae09-bdd4dc13ad38' });

const wordBank: WordEntry[] = JSON.parse(
  readFileSync(resolve('src/data/wordBank.json'), 'utf-8')
);

function toDocId(word: string): string {
  return word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function seed() {
  // Firestore batch limit is 500 operations per commit
  const BATCH_SIZE = 500;
  let seeded = 0;

  for (let i = 0; i < wordBank.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = wordBank.slice(i, i + BATCH_SIZE);

    for (const entry of chunk) {
      const ref = db.collection('wordBank').doc(toDocId(entry.word));
      batch.set(ref, entry, { merge: true });
      seeded++;
    }

    await batch.commit();
  }

  console.log(`✓ Seeded ${seeded} words to Firestore wordBank collection`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
