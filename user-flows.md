# Bluff Master — User Flows

Three-player example: **Alice** (host), **Bob**, **Carol**

---

## Phase map

```
LOGIN → LOBBY → WRITING → VOTING → RESULTS → (loop: WRITING | end)
```

---

## LOGIN

1. User opens the app, enters a display name, clicks "Enter the Room"
2. App calls `signInAnonymously()` then `updateProfile(user, { displayName })`
3. User lands on the Create / Join screen

**All three players do this independently.**

---

## LOBBY

| Actor | Action | Result |
|-------|--------|--------|
| Alice | Clicks "Create Room" | Game doc created in Firestore with `status: 'lobby'`; 6-char room code shown |
| Bob | Enters code, clicks "Join Room" | Added to `players[]` via `arrayUnion` |
| Carol | Same as Bob | Added to `players[]` |
| All | Real-time game listener fires | All three see each other in the participants sidebar |
| Alice | Sees "Start Round" button | Bob and Carol have no actionable UI — they wait |

---

## WRITING

Triggered by Alice clicking "Start Round":

1. `resetBluffs(gameId)` — deletes all bluffs from any previous round
2. `getRandomWord(gameId)` — picks unused word from Firestore `wordBank`, updates `usedWordIds` on the game doc
3. `startGame(gameId, word, definition)` — sets `status: 'writing'`, writes word + definition to game doc, creates SYSTEM bluff doc (the real definition)

| Actor | Sees | Can do |
|-------|------|--------|
| Alice (host) | Word, bluff textarea, submission count, "Force Close" button | Write + submit her bluff; see how many have submitted; force-advance the phase |
| Bob, Carol | Word, bluff textarea | Write + submit their bluff; see "Submission Received" confirmation after submitting |

**Notes:**
- Non-host players track submission via local `hasSubmitted` state (not Firestore listener) — the Firestore bluffs collection query fails for them during `writing` because the SYSTEM doc is included and their rule denies it
- Only Alice (host) has an active bluffs listener during writing — so she sees the submission count and the force-close button
- Force-close shows when `bluffs.length > 1` (at least one player + the SYSTEM doc)

---

## VOTING

Triggered by Alice clicking "Force Close Writing Phase":

1. `setStatus(gameId, 'voting')`
2. All players' bluffs listeners re-establish (status changed away from `writing`)
3. All bluffs (including real definition) load and are shuffled randomly per client

| Actor | Sees | Can do |
|-------|------|--------|
| All | Shuffled bluffs labelled A, B, C… | Vote for one (can't vote for own bluff) |
| Alice (host) | "Reveal the Truth" button | Advance to results at any time |

**Notes:**
- No enforcement that all players have voted before host can advance
- Voting on your own bluff is disabled in UI and blocked by Firestore rule (`request.auth.uid != existing().userId`)
- Each UID can only add their vote once (`!(request.auth.uid in existing().votes)`)

---

## RESULTS

Triggered by Alice clicking "Reveal the Truth":

1. `updateScores(gameId, bluffs, players)` — calculates and writes updated scores:
   - **+1** for each person who voted for your fake bluff (you fooled them)
   - **+2** for voting for the real definition (you spotted the truth)
2. `setStatus(gameId, 'results')`

| Actor | Sees | Can do |
|-------|------|--------|
| All | Real definition highlighted; all bluffs with vote avatars and fool counts; updated leaderboard | Nothing — just review |
| Alice (host) | "Prepare Next Round" button | Start another round or leave |

---

## NEXT ROUND

Triggered by Alice clicking "Prepare Next Round":

- Calls `handleStartRound` directly (skips lobby — goes straight back to `writing`)
- State reset: `hasSubmitted = false`, `myBluff = ''`, `hasVoted = false`, `bluffs = []`
- `usedWordIds` accumulates across rounds; cycles back to full pool when all 80 words are used

---

## Known holes / open design questions

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | Host can advance phases before everyone votes | Low | By design — host controls pace |
| 2 | Refreshing the page kicks a player out | Medium | No rejoin flow; player re-enters name and rejoins manually |
| 3 | Disconnected players stay in the roster | Low | No presence/heartbeat; ghost players don't break anything |
| 4 | Scores calculated client-side by host only | Low | If host disconnects mid-voting→results transition, scores won't update |
| 5 | No end-game screen | Low | After "results → lobby" transition, game stays in lobby indefinitely |
| 6 | Single host — no host transfer | Medium | If host leaves, no one can advance phases |
