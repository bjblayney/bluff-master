# Bluff Master — TODO

See [agents.md](agents.md) for full project context and [user-flows.md](user-flows.md) for the phase map.

---

## Active / in progress

_(nothing currently in flight)_

---

## Bugs

_(none currently known)_

---

## Gameplay improvements

- [ ] **End-game screen** — after a set number of rounds (configurable by host in lobby), show a final scoreboard instead of returning to lobby
- [ ] **Host transfer** — if host disconnects or leaves, promote the next player to host so the game can continue
- [ ] **Rejoin flow** — if a player refreshes or closes the tab, let them re-enter their name and rejoin the same game using their previous UID (auth is anonymous so UID persists in the browser)
- [ ] **Vote gating** — optionally prevent host from advancing to results until all players have voted (could be a lobby setting)
- [ ] **Server-side score calculation** — move scoring out of the host client into a Cloud Function to prevent score manipulation and handle host-disconnect edge case

---

## UX / polish

- [ ] **Presence indicators** — show which players are still connected (heartbeat or Firestore presence)
- [ ] **Round timer** — optional countdown during writing phase so host doesn't have to manually close it
- [ ] **Mobile layout** — test and polish on small screens; sidebar collapses but voting grid may need work
- [ ] **Kick player** — host should be able to remove a disconnected/idle player from the roster

---

## Word bank

- [ ] Expand beyond 80 words — currently cycles after exhausting the full bank
- [ ] Add categories (e.g., science, archaic English, food) and let host pick a theme
- [ ] Admin UI for adding/editing words without editing JSON + pushing to git

---

## Infrastructure

- [ ] **Grant service account `Service Usage Viewer` role** — currently required to run CI deploy without 403. Needs to be done manually in Google Cloud IAM console: https://console.cloud.google.com/iam-admin/iam?project=gen-lang-client-0840619712
- [ ] Consider migrating off the AI Studio Firebase project to a dedicated project (current project ID `gen-lang-client-*` is an AI Studio artifact)
