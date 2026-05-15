# Bluff Master

A real-time multiplayer word-bluffing game. Players are shown an obscure word and each submit a fake definition — then everyone votes to find the real one. Points go to whoever fools the most people.

Built with React, Firebase (Auth + Firestore), and Vite. Deployed to Firebase Hosting via GitHub Actions.

**Live:** https://gen-lang-client-0840619712.web.app

---

## Running locally

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/bjblayney/bluff-master.git
cd bluff-master
npm install
npm run dev
```

Open http://localhost:3000. The app connects to the live Firebase project, so the word bank and auth work out of the box — no API keys needed for local dev.

---

## Adding or updating words

The word bank lives in [`src/data/wordBank.json`](src/data/wordBank.json) as a plain array of `{ word, definition }` objects:

```json
{ "word": "Apricity", "definition": "The warmth of the sun in winter." }
```

To add new words:
1. Edit `src/data/wordBank.json`
2. Commit and push to `main`

The CI/CD pipeline automatically seeds the updated list to Firestore on every push — no manual steps required.

---

## CI/CD pipeline

Every push to `main` runs the following via GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

1. **Seed word bank** — upserts all words from `wordBank.json` into the Firestore `wordBank` collection
2. **Build** — compiles the Vite/React app
3. **Deploy** — pushes the build to Firebase Hosting and updates Firestore security rules

### Required GitHub secrets

| Secret | Description |
|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON ([generate here](https://console.firebase.google.com/project/gen-lang-client-0840619712/settings/serviceaccounts/adminsdk)) |
| `GEMINI_API_KEY` | Optional — not currently used by the app |

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Motion
- **Auth:** Firebase Auth (Google sign-in)
- **Database:** Firestore (real-time game state + word bank)
- **Hosting:** Firebase Hosting
- **CI/CD:** GitHub Actions
