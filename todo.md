# Bluff Master — TODO

See [agents.md](agents.md) for full project context and [user-flows.md](user-flows.md) for the phase map.

---

## Active / in progress

_(nothing currently in flight)_

---

## Bugs

_(none currently known — last tested May 14 2026 with 2-player session)_

---

## Gameplay improvements

- [x] **End-game screen** — after a set number of rounds (configurable by host in lobby: 5/10/15), show a final scoreboard instead of returning to lobby
- [ ] **Host transfer** — if host disconnects or leaves, promote the next player to host so the game can continue
- [x] **Rejoin flow** — returning users are auto-prompted to rejoin their last room; joining mid-game works for both new and returning players
- [x] **Vote gating** — optionally prevent host from advancing to results until all players have voted (could be a lobby setting)
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

- [x] **Grant service account `Service Usage Viewer` role** — done
- [x] **Grant service account `Firebase Admin` role** — done (needed for rules compilation in CI)
- [ ] Consider migrating off the AI Studio Firebase project to a dedicated project (current project ID `gen-lang-client-*` is an AI Studio artifact)
