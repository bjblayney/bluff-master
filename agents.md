# Bluff Master — Agent Knowledge Base

A real-time multiplayer word-bluffing party game. Players are shown an obscure word, each writes a fake definition, then everyone votes. Points go to whoever fools the most people.

**Live:** https://gen-lang-client-0840619712.web.app  
**Repo:** https://github.com/bjblayney/bluff-master

---

## Related docs

- [TODO list](todo.md) — known issues, planned work, and open decisions
- [User flows](user-flows.md) — complete phase-by-phase flow map with identified holes

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion (Framer) |
| Auth | Firebase Auth — **Anonymous sign-in** (user enters a display name) |
| Database | Firestore (named database — see below) |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

---

## Firebase project

- **Project ID:** `gen-lang-client-0840619712`
- **Named Firestore database:** `ai-studio-ba922d2a-cccb-45d3-ae09-bdd4dc13ad38`
  - ⚠️ This is NOT the `(default)` database. All client and admin SDK calls must target this named DB explicitly.
- **Config file:** `firebase-applet-config.json` (intentionally committed — not a secret per Firebase docs)
- **Rules file:** `firestore.rules` — deployed via `firebase deploy --only firestore` (NOT `firestore:rules`, which doesn't work with the named DB array config in `firebase.json`)

---

## Local development

No environment variables or API keys needed. The app connects to the live Firebase project out of the box.

```bash
npm install
npm run dev   # starts on http://localhost:3000
```

---

## CI/CD pipeline

Triggered on every push to `main`:

1. **Seed word bank** (`npm run seed`) — upserts `src/data/wordBank.json` into the Firestore `wordBank` collection using Firebase Admin SDK
2. **Build** (`npm run build`) — compiles Vite/React app to `dist/`
3. **Deploy** (`firebase deploy --only hosting,firestore`) — pushes hosting build and Firestore rules

### Required GitHub secrets

| Secret | Purpose |
|--------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON for Admin SDK + Firebase CLI |
| `GEMINI_API_KEY` | Optional — not currently used |

⚠️ The service account needs **Service Usage Viewer** (`roles/serviceusage.serviceUsageViewer`) in addition to the default Firebase Admin role — otherwise the `firestore.googleapis.com` API check in the CLI returns 403.

---

## Codebase structure

```
src/
  App.tsx          — All UI, state management, auth, phase rendering
  lib/
    firebase.ts    — Firebase init, anonymous auth helper (signInAnon)
    gameService.ts — All Firestore game operations (GameService object)
    gemini.ts      — Unused; left in place but not imported
  data/
    wordBank.json  — Source of truth for 80 curated obscure words
scripts/
  seedWordBank.ts  — Admin SDK script; seeds wordBank.json → Firestore
firestore.rules    — Security rules (deployed to named DB)
firebase.json      — Firebase config; uses array format for firestore to target named DB
```

---

## Key data model

### `games/{gameId}`
```
hostId: string
status: 'lobby' | 'writing' | 'voting' | 'results' | 'ended'
word: string
definition: string
round: number
players: [{ uid, name, score }]
usedWordIds: string[]   — prevents word repeats within a session
createdAt, updatedAt: Timestamp
```

### `games/{gameId}/bluffs/{userId}`
```
gameId: string
userId: string          — 'SYSTEM' for the real definition doc
userName: string        — 'REAL_DEFINITION' for the system doc
text: string
votes: string[]         — array of voter UIDs
isReal: boolean
```

### `wordBank/{wordId}`
```
word: string
definition: string
```
Word IDs are `word.toLowerCase().replace(/\s+/g, '-')`.

---

## Important gotchas

- **Named database**: Always use `--only firestore` (not `firestore:rules`) when deploying rules locally. The `firestore:rules` sub-target does not work with the array-format `firebase.json` config.
- **Bluffs listener**: Non-host players do NOT get a bluffs Firestore listener during the `writing` phase (Firestore rejects the collection query because the SYSTEM doc is included and the rule denies it). Submission state is tracked locally via `hasSubmitted`. The listener is established fresh when status changes away from `writing`.
- **Scoring**: Calculated client-side by the host when advancing voting → results. +1 per person fooled by your bluff, +2 for voting for the real definition.
- **ESM modules**: `"type": "module"` in package.json. Firebase Admin SDK imports must use sub-packages: `firebase-admin/app`, `firebase-admin/firestore` — NOT `import * as admin from 'firebase-admin'`.
