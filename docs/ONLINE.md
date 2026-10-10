# Online friend rooms (1.1 trial)

## Scope

- Title-screen entry is below the adventure button. Any of the three `miracle-mine:v1` slots must contain all stage IDs 0–29. Eligibility is accepted from local progress, like existing sky-voyage eligibility; it is not server-verified.
- Two invited players, one target, independent 5×5 boards. Same server seed, initial board and indexed replenishment stream. Each player consumes their own stream as they play. Addition, multiplication, merges, clears and adjacency follow the existing engine.
- Shared target/seed becomes available only when both players are connected and ready. The start is scheduled six seconds ahead. Local interaction is synchronous and never waits for API or peer replies.
- Short Toto/Luka introduction uses the existing dialogue component, including skip. Its read flag is separate from adventure saves and it can be replayed from the lobby.
- No login, profile, chat, image upload, public matchmaking, rating or ranking changes. Glicko is a future design choice, not implemented in this trial. Per-room credentials are distinct from the ranking's per-save UID/key. No recovery code or permanent online identity is introduced.

## Transport and lifecycle

`RTCPeerConnection` + an unordered, zero-retransmit data channel carries bounded, sequenced snapshots (board, trace, operation, progress and finish flags). Drag updates are throttled and a one-second heartbeat detects stale peers. Invalid, stale, oversized and unrelated payloads are ignored. Snapshots are display only; the server validates the final operation transcript independently.

Nontrickle SDP is exchanged once through `/api/online`; gathering is bounded and can proceed with already gathered candidates if STUN is slow. A candidate is only a possible route, not a connection guarantee. Room state is polled about every 2.5 seconds while waiting and every 2 seconds while confirming results. Active play does not poll or send moves to the server. Both players submit a final transcript; the other player gets a 1.5-second close-finish window after receiving a completion snapshot. Rounds are bounded at three minutes and 300 moves.

Reloading a live round cannot resume it. Fixed SDP is not reused for a new RTC peer; create a new room after a reload. Leaving, sustained disconnection, or being hidden/stale for eight seconds produces a no-contest outcome. A room URL in the fragment carries only an unguessable room UUID, never participant credentials. Share it only with a trusted person.

Google's public `stun.l.google.com:19302` is used for this trial. There is **no TURN relay**. Some mobile/carrier NATs, school/corporate networks, VPNs and firewalls will not connect. Connection establishment may time out; create a new room or change networks. This is not guaranteed production connectivity. No new paid service or privileged credential is required.

## Server verification and fairness limits

`server/online.js` creates only the additive `mm_online_rooms` table/indexes through the already provisioned Neon connection. It never reads/writes ranking or save tables. The random bearer key is hashed before storage. Atomic version-CAS updates protect seat allocation, readiness, descriptions and reports. Duplicate identical requests are idempotent; conflicting repeat reports and a third player are rejected.

The final transcript is replayed from the seed, checking every index, adjacency, unique path, operator, timestamp, refill, and first success. No moves after success are accepted. Raw operation arrays are processed for validation but are not persisted: only summary, receipt time and a retry fingerprint remain.

A win needs both players' validated reports. Two solved reports within 1.5 seconds plus their clock uncertainties are a draw; disagreement between reported finish order and server arrival order is uncertain. Large clock uncertainty, missing reports, and disconnects are no contest. Two unfinished reports are a no-solution draw. These are conservative prototype heuristics, **not perfectly fair latency correction**. Client clocks/operation timing can be forged, bots are possible, and this is not a cheat-resistant rated protocol.

## Storage, load and privacy

App storage contains room identifiers, hashes, SDP connectivity information, readiness, server seed/start time, report summaries/fingerprints and outcome. Waiting rooms expire after 30 minutes; concluded rooms expire after at most two more minutes. SDP/ICE is cleared immediately when a result/cancellation becomes terminal. Expired rooms cannot be used and are deleted on later access to that room or in bounded batches on later room creation. There is no scheduled deletion; expired rows can remain if no new room is created. This retention description does not cover infrastructure logs/backups.

Request bodies are capped at 64 KiB, SDP at 16 KiB per participant, and transcripts at 300 moves. There are at most three retained rooms per host credential and 500 globally, enforced by unique slots. Anonymous credential rotation can still consume the shared capacity; this is a small invite-room trial, not a complete abuse-management system. Existing provider quotas and budget settings still apply.

A waiting pair makes about 48 polling API requests per minute (two clients × 60/2.5), mostly one small SQL SELECT each, plus a handful of create/join/signal/ready/report writes. During gameplay the board traffic is peer-to-peer; there are no per-move Function/DB calls. Result polling adds about 60 requests/minute only while waiting for confirmation, normally for seconds. Long abandoned lobbies and repeated connection attempts consume more than active play. Free-tier suitability depends on total traffic, duration, existing ranking/share usage and provider limits; it is not an unlimited-free or zero-cost guarantee.

The entry screen explains IP/connectivity exposure and service recipients before the user explicitly creates/joins. `/about#online-privacy` is the permanent detailed notice. No cameras/microphones/location permissions are used. Existing adventure data is neither sent to the opponent nor migrated.

## Development and release

```
npm ci --cache /tmp/mm-npm-cache
npm test
npm run build
npm run preview:online
```

For the real browser integration suite (requires a normal Chromium-capable environment):

```
npx playwright install --with-deps chromium
npm run test:browser
```

The Playwright suite starts the local preview server and runs two independent browser contexts. It does not mock `RTCPeerConnection` or disable browser/network protections. A same-runner ICE connection tests the application handshake and DataChannel behavior, not carrier NAT traversal or real-device compatibility.

The preview command uses an ephemeral PGlite database for both APIs, with no production connection. Do not use it for hosted production. The production handler remains `api/online.js` with Neon. `scripts/deploy-payload.mjs` includes every API entrypoint, and `/build-info.json` identifies the source SHA. Follow [DEPLOY.md](DEPLOY.md).

Unit/integration tests cover deterministic solvability, replay integrity, save unlock/nonmutation, protocol payloads, idempotency, slot/race allocation, authorization, early results, clock/arrival ambiguity, expiration, disconnects, and request limits. Release-specific browser/device coverage and any remaining limits belong in the release report. Desktop Chromium or narrow CSS viewport tests do not establish actual iPhone Safari, cellular, Wi-Fi-to-cellular, background-suspension or TURN behavior.
