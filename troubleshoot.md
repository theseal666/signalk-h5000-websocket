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
