# Security Specification: Bluff Master

## Data Invariants
1. A game must have a host (the creator).
2. A bluff must be associated with an active game and a valid user.
3. Players can only see other's bluffs during the voting/results phase.
4. Players cannot vote for their own bluffs.
5. Players cannot vote more than once per round.
6. Only the host can advance game phases.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Host Spoofing**: Player B trying to change game status to 'results' when Player A is host.
2. **Phase Jumping**: Player trying to submit a bluff when game is in 'voting' phase.
3. **Ghost Voting**: Player trying to vote multiple times by sending an array with multiple new UIDs.
4. **Self-Voting**: Player trying to vote for their own submitted bluff.
5. **ID Poisoning**: Creating a game with a 1MB string as the ID.
6. **Shadow Fields**: Adding an `isAdmin: true` field to a user profile update.
7. **Premature Peeking**: Attempting to list bluffs during the 'writing' phase.
8. **Definition Tampering**: Non-host player trying to update the 'word' or 'definition' fields in the game document.
9. **Score Padding**: Player trying to update their own score field directly (scores should be calculated from votes in the results phase or updated by host/system logic if we allow host to manage scores, but here we prefer system-driven).
10. **Orphaned Bluffs**: Submitting a bluff for a game that doesn't exist.
11. **Negative Rounds**: Host trying to set `round: -1`.
12. **Future Timestamps**: Submitting a bluff with a `createdAt` in the future (not using server timestamp).

## Test Runner (firestore.rules.test.ts)
(To be implemented if environment supports firestore-emulator testing, otherwise represented as a logical audit).
