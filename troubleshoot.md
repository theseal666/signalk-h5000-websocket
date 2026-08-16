```markdown
# H5000 WebSocket — Troubleshooting & Reverse-Engineering Notes

_Compiled 2026-08-15 from live debugging session against the boat's H5000 CPU (192.168.1.104:2053)._

## Protocol (confirmed working)

Subscribe by sending, once connected:

```json
{"DataReq":[{"id":<N>,"repeat":true,"inst":0}, ...]}
```

Replies arrive as:

```json
{"Data":[{"id":<N>,"valid":<bool>,"val":<num>,"sysVal":<num>,"valStr":"<string>"}]}
```

- `val` — appears to be the SI-ish/raw value (varies by channel, see caveat below)
- `sysVal` — **NOT reliably SI across all channels** (see bug below)
- `valStr` — human-readable display string, rounded

## ⚠️ Known bug: `sysVal` is not consistently SI

The plugin's current assumption (see doc comment on Unit Conversion Type: *"Only applied when the H5000 omits sysVal (already SI)"*) does not hold for every channel:

- **Angle channels** (heading, rudder, wind angle): `sysVal` genuinely is **radians** — SI, as expected.
- **Depth channels** (IDs 77, 165, 238): `sysVal` is in **feet**, not meters. Example: ID 77 gave `val: 3.66` (meters, correct) but `sysVal: 12.007874` (≈ 3.66m × 3.28 — feet). Since the plugin code prefers `sysVal` whenever present (`typeof item.sysVal === 'number' ? item.sysVal : convertValue(...)`), depth will silently be reported in the wrong unit/magnitude regardless of the configured Unit Conversion Type.

**Fix needed:** don't blindly trust `sysVal` per-channel. Either verify empirically per Data ID before trusting it, or add a per-mapping override to force using `val` + a manual conversion instead of `sysVal`.

## Confirmed Data ID mappings (this boat, 2026-08-15)

| ID | Signal K path | Notes |
|----|----------------|-------|
| 17 | `navigation.speedThroughWater` | Correctly reports `valid:false` when moored/no flow — not a bug, paddlewheel logs don't register near-zero speed |
| 77 | depth | ~3.66m confirmed; **subject to sysVal-unit bug above** |
| 142 | `navigation.headingMagnetic` | Compass heading, confirmed ~188° at time of test |
| 140 / 141 | wind angle (AWA) | Duplicate/paired channels, ~-23° to -20° range observed |
| 228 | `steering.rudderAngle` | Confirmed via live wiggle test — clean 80.9° symmetric sweep (-41.7° to +39.2°), fast update rate |
| 336 | secondary rudder feedback? | Also swung large (~80.7°) during rudder wiggle but off-center and slower update rate — possibly autopilot's own rudder reference. Unconfirmed. |
| 37 | TWD or AWA/TWA? | ~212°, cross-checked against a nearby Viva weather station reporting 232° TWD (reasonable offset for different location) — plausible TWD but not fully confirmed |
| 46 / 47 | AWS / TWS | ~8.7–8.8kt each, close together consistent with boat near-stationary (apparent ≈ true at rest) |

## Still unconfirmed / needs verification under sail

- Disambiguate ID 37 vs 140/141 as TWD vs AWA vs TWA — needs a controlled test comparing to known true wind data while moving
- Separate TWA from AWA and TWS from AWS definitively — best done live, underway, comparing to the physical B&G display
- Heel angle — best candidates from a near-zero baseline: **121, 122** (near-exact zero at rest), secondary candidates 125 (-3.8°), 240 (-4.4°), 354 (-6°), 440/441 (±5°)
- Temp channel (same transducer as depth/log, ID 17/77) — not yet isolated
- Trip log vs total log — ID 27 (~7120, decimal precision confirmed to ~0.5) is very likely **total/lifetime log**, not a resettable trip counter, given the magnitude
- Unexpected lat/lon-shaped values at IDs 340/341 and 352/353 (~58°04'N 011°47'E) despite Vulcan GPS reportedly disconnected — worth investigating source
- Apparent race-timer cluster: ID 31 ("00:00:00"), ID 230 ("00:10:00" countdown), IDs 355–361 (mostly zero/timer-shaped)

## Methodology for further mapping

1. Connect via `wscat` (uses the `ws` npm package — same as this plugin; note Node's *native* `WebSocket` hangs silently against this H5000, unrelated quirk, don't use it for testing)
2. Send a broad `DataReq` (e.g. IDs 1–500) in one batch
3. Capture responses to a file over a time window
4. For a specific channel: trigger the relevant physical action (turn wheel, walk to heel the boat, etc.) during a timed capture window, then compute per-ID min/max spread — the channel with the largest, cleanest, fastest-updating spread during the action is your answer
5. Cross-reference against known instruments (Viva weather stations, physical B&G displays) where possible for sanity-checking absolute values
```
H5000 WebSocket Troubleshooting Summary

Last updated: 2026-08-16, live underway session (broad reach, wind on starboard, ~8 kn boat speed, 15–18 kn apparent wind at time of scan).

Protocol Overview

The system uses JSON messaging over ws://192.168.1.104:2053. Clients send DataReq with channel IDs, receiving Data responses containing val, sysVal, and valStr fields for each requested signal.

RESOLVED: sysVal cannot be trusted as "already SI"

Original theory was that sysVal is always SI and only val needs the configured conversionType. Live testing on 2026-08-16 disproved this more broadly than first thought:

Depth channels (77, 165, 238): sysVal is in feet, not meters. val is in meters directly.
Wind/boat-speed channels (41, 42, 46, 47, 497): sysVal is an unconverted duplicate of val, still in knots — not m/s.
Some angle-labeled channels (e.g. 384): sysVal is also an unconverted duplicate of val (still in degrees), not radians, despite behaving like an angle channel otherwise.
Channels where sysVal genuinely was reliable radians: 140, 142, 228, 505 (heel candidate) — confirmed by cross-checking val (deg) × π/180 ≈ sysVal (rad).

Fix applied: index.js no longer branches on sysVal at all. It always computes convertValue(item.val, config.type). This was correct in every single case tested — depth, wind/boat speed, and angle channels alike — so it's now the sole path. Deployed and restarted on the Pi 2026-08-16; verified live via Data Browser (see below).

Confirmed Signal Mappings (as of 2026-08-16)
Data ID	Signal K Path	Conversion	Live value at verification	Notes
17	navigation.speedThroughWater	speed	not broadcasting	mapped but H5000 isn't sending this ID right now — needs investigation
46	environment.wind.speedApparent	speed	5.26 m/s (10.2 kn)	matches conditions
47	environment.wind.speedTrue	speed	6.46 m/s (12.6 kn)	matches conditions
77	environment.depth.belowTransducer	none (already meters)	15.05 m	previously showed ~3.3x inflated due to sysVal-in-feet bug
140	environment.wind.angleApparent	angle	1.83 rad (104.9°)	
142	environment.wind.directionTrue	angle	278.0° (live, post-fix)	✅ CONFIRMED 2026-08-16 — reclassified from headingMagnetic after sailing a 160-170° course showed this channel reading 283°, ~120° off for heading but a great fit for TWD. User confirmed live instrument TWD reads "270-ish" — 278.0° matches. No longer provisional.
221	navigation.headingMagnetic	angle	173.9° (live, post-fix)	provisional — repointed here because it clusters tightly with the reported 160-170° course across every scan (moored and sailing), and tracks correctly now that 142 is correctly excluded. Not yet distinguished from the also-plausible 9, 37, and 39, which track almost identically. Recommend a direct compass cross-check to confirm 221 specifically over the others.
228	steering.rudderAngle	angle	2.60 rad (149.3°)	⚠️ confirmed wrong — user confirmed on 2026-08-16 that yesterday's "verified via physical testing" mapping for ID 228 was incorrect. Removed from live config. Needs re-discovery from scratch; do not treat 228 as rudder angle going forward.
New candidates from live sailing conditions (broad reach, wind starboard, ~8kn boat speed)
Heel angle: ID 505 is the best current candidate. Read -12.4° (moored) → -14.5° → -11.2° across three live scans, tracking with your reported ~12° heel far better than the earlier candidate (440/441, which only read ~-6° and swung wildly between -0.7° and -6.2° second to second — likely a different/noisier signal, possibly still worth checking but deprioritized).
Pitch: ID 384 is the best current candidate, reading -0.19° to -0.56° across scans — roughly matches your reported "0.5-ish". Note: this channel's sysVal was one of the ones proven unreliable (duplicate of val in degrees, not radians) — the plugin fix specifically corrects this by ignoring sysVal here.
Both 505 and 384 are now wired into the plugin config as navigation.attitude.roll / navigation.attitude.pitch but should be treated as best-guess, not fully locked. Recommend a confirming check on the opposite tack (heel sign should flip) and in flatter/gustier conditions (pitch should track wave action).
Other channels seen live but not yet mapped

Full ID sweep (0–599, 15s subscription window) turned up 120 active IDs. Notable unmapped clusters:

GPS-like pairs (lat/lon, valStr in degree-minute format): 309/310, 340/341, 352/353, 421/422. 309/310 and 421/422 move consistently with ~8kn boat speed (confirmed live position feeds). 340/341 and 352/353 stayed static across scans — likely a waypoint or anchor mark, not live GPS.
Boat speed candidates: 41, 42, 497 all read close to actual boat speed (~8–9 kn) even while ID 17 (the documented SOW channel) wasn't broadcasting. Worth checking whether 42/497 should become the primary SOW source.
ID 39: biggest single delta observed between moored and sailing snapshots (-76°) — no mapping guess yet.
IDs 355–361: still unidentified, timer/counter-shaped values (HH:MM:SS or small decimals), mostly zero at rest.
Temperature channel: still unidentified.
Trip vs. total log distinction: still unidentified (candidates among the large unmapped numeric IDs like 27, 382, 467, 468 which all move together — possibly log/trip distance in some raw unit).
Outstanding Verification Tasks
Confirm heel (505) sign flips on opposite tack.
Confirm pitch (384) responds to wave action / trim changes.
Investigate why ID 17 isn't broadcasting; consider switching SOW to 42 or 497.
Rudder angle: ID 228 confirmed wrong (2026-08-16). Needs full re-discovery — turn the wheel lock-to-lock during a capture window and look for a channel that (a) swings through a plausible ±30-40° range and (b) returns to ~0 when centered.
True wind direction: CONFIRMED ID 142 (see reclassification above), not 9/37/221 as earlier notes assumed. User cross-checked against live instrument reading ("270-ish") and it matches (278.0°).
Heading: need to distinguish which of 9, 37, 221, 39 is the real navigation.headingMagnetic — all four track the reported course equally well so far. 221 is wired in live and reads correctly (173.9° vs 160-170° course) but is not yet distinguished from the others; confirm against a physical compass when convenient.
Temperature channel isolation — not yet attempted.
GPS coordinate source clarification — narrowed to 309/310 or 421/422 as live sources; 340/341 and 352/353 look static (waypoint/anchor).
IDs 355–361 (timer-related, unresolved).
ID 39 (large delta, no mapping guess).
Recommended Testing Methodology

Physical trigger methods during capture windows — turning the helm, adjusting heel, comparing outputs to known reference instruments — help isolate channels through min/max spread analysis. wscat (installed globally on the Pi) works for manual protocol inspection; a small Node scan script (subscribing to IDs 0–599 for a ~15s window) is a faster way to get a full snapshot than manual dev-tools inspection of the H5000's own web UI.
