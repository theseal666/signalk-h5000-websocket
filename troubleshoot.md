# H5000 WebSocket Troubleshooting Summary

_Last updated: 2026-08-16 — includes results from a live bridge-opening speed test and cross-reference against the H5000's own vendor `eDataType` JavaScript enum._

## Protocol Overview
The system uses JSON messaging over `ws://192.168.1.104:2053`. Clients send `DataReq` with channel IDs, receiving `Data` responses containing `val`, `sysVal`, and `valStr` fields for each requested signal.

## RESOLVED: `sysVal` cannot be trusted as "already SI"

Original theory was that `sysVal` is always SI and only `val` needs the configured `conversionType`. Live testing on 2026-08-16 disproved this more broadly than first thought:

- **Depth channels** (77, 165, 238): `sysVal` is in **feet**, not meters. `val` is in meters directly.
- **Wind/boat-speed channels** (41, 42, 46, 47, 497): `sysVal` is an **unconverted duplicate of `val`**, still in knots — not m/s.
- **Some angle-labeled channels** (e.g. 384): `sysVal` is also an unconverted duplicate of `val` (still in degrees), not radians, despite behaving like an angle channel otherwise.

**Fix applied**: `index.js` no longer branches on `sysVal` at all. It always computes `convertValue(item.val, config.type)`. This was correct in every single case tested — depth, wind/boat speed, and angle channels alike — so it's now the sole path. Deployed and restarted on the Pi 2026-08-16; verified live via Data Browser.

## Confirmed Signal Mappings (final, as of 2026-08-16)

| Data ID | Signal K Path | Conversion | Status |
|---|---|---|---|
| 41 | navigation.speedOverGround | speed | ✅ Confirmed — GPS-derived SOG cross-check during river transit matched (avg 3.669 kn against a targeted ~4.0 kn STW hold). |
| 42 | navigation.speedThroughWater | speed | ✅ **CONFIRMED via controlled speed test 2026-08-16.** During the bridge-opening maneuver, user held ~4.0 kn STW (against ~0.35 kn of current) for several minutes. Post-hoc log analysis found ID 42's longest sustained run was 174 seconds averaging 4.020 kn — the single best match of all speed-shaped candidates (234 TargetBoatSpeed and 240 PolarSpeed were both ruled out as target/polar channels, not measured speed). GPS-derived SOG over the same window averaged 3.669 kn, implying ~0.35 kn of current against — consistent with the user's own real-time estimate. |
| 37 | navigation.headingMagnetic | angle | ✅ **CONFIRMED — final.** Vendor `eDataType` enum (extracted from the H5000's own JS) identifies ID 37 as `Heading`. Earlier candidates (221, 9, 39) were statistically plausible but not vendor-backed; 37 is now the sole heading source. |
| 146 | steering.rudderAngle | angle | ✅ **CONFIRMED — final, replaces earlier wrong guess.** ID 228 (used yesterday) was confirmed wrong by the user and removed. Vendor enum identifies ID 146 as `RudderAngle`; ID 228 is actually `TargetTrueWindAngle`. 146 is wired into the live config as the sole rudder source. |
| 140 | environment.wind.angleApparent | angle | ✅ Confirmed, matches conditions throughout. |
| 141 | environment.wind.angleTrueWater | angle | ✅ Vendor-confirmed label, tracks consistently. |
| 142 | environment.wind.directionTrue | angle | ✅ Confirmed 2026-08-16 — reclassified from headingMagnetic after sailing a 160-170° course showed this channel reading 283°, ~120° off for heading but a great fit for TWD. User cross-checked against the live instrument reading ("270-ish") — 278.0° matched. |
| 46 | environment.wind.speedApparent | speed | ✅ Confirmed, matches conditions. |
| 47 | environment.wind.speedTrue | speed | ✅ Confirmed, matches conditions. |
| 77 | environment.depth.belowTransducer | none (already meters) | ✅ Confirmed. Previously showed ~3.3x inflated due to the sysVal-in-feet bug; correct since the fix. |

## Vendor-confirmed but not currently broadcasting on this unit

| Data ID | Vendor Label | Notes |
|---|---|---|
| 123 | AttitudePitch | Vendor-correct ID for pitch, but this H5000 unit was confirmed **not** to broadcast it during multiple live scans. Pitch is sourced from the separate racebox IMU plugin instead — no conflict since 123 is silent. |
| 124 | AttitudeRoll | Same as above — vendor-correct but silent on this unit. Roll sourced from the racebox IMU plugin. |

Earlier candidates 505 (heel) and 384 (pitch) were **statistically-guessed, not vendor-backed**, and have both been ruled out: 505 doesn't exist in the H5000's defined ID range (max is 480), and 384 is actually `TWSCorrection`, a calibration factor, not an attitude channel. Both removed from the live config.

## Ruled out / corrected this session

| Data ID | Was mapped as | Actually is (per vendor enum / live testing) |
|---|---|---|
| 228 | steering.rudderAngle | `TargetTrueWindAngle` — confirmed wrong by user, removed 2026-08-16 |
| 221 | navigation.headingMagnetic (provisional) | `SailingCourse` — tracked the reported course closely but is not the vendor `Heading` channel; superseded by 37 |
| 505 | navigation.attitude.roll (heel, provisional) | Not a valid H5000 Data ID at all (max defined ID is 480) |
| 384 | navigation.attitude.pitch (provisional) | `TWSCorrection` — a wind calibration factor, not an attitude channel |
| 234 | (speed candidate) | `TargetBoatSpeed` — a target/reference value, not measured STW |
| 240 | (speed candidate) | `PolarSpeed` — a polar-table reference value, not measured STW |

## Other channels seen live but not yet mapped

- **GPS-like pairs** (lat/lon, `valStr` in degree-minute format): 309/310, 340/341, 352/353, 421/422. 309/310 and 421/422 move consistently with live boat speed (confirmed live position feeds). 340/341 and 352/353 stayed static across scans — likely a waypoint or anchor mark, not live GPS.
- **IDs 355–361**: still unidentified, timer/counter-shaped values (HH:MM:SS or small decimals), mostly zero at rest.
- Temperature channel: still unidentified.
- Trip vs. total log distinction: still unidentified (candidates among the large unmapped numeric IDs like 27, 382, 467, 468 which all move together — possibly log/trip distance in some raw unit).

## Outstanding Verification Tasks
- Temperature channel isolation — not yet attempted.
- GPS coordinate source: narrowed to 309/310 or 421/422 as live sources; 340/341 and 352/353 look static (waypoint/anchor) — pick one pair for `navigation.position`.
- IDs 355–361 (timer-related, unresolved).
- Trip/total log distance channel — still unresolved (MFD's `navigation.trip.log` reads 0 at the dock, so there's no nonzero ground truth to correlate against yet — revisit once underway).

## Confirmed via MFD cross-check (2026-08-16)

A second connector (the boat's MFD, NMEA-fed) was added to Signal K, which gives independent ground-truth values for several paths. Cross-checking unmapped H5000 IDs against those MFD-sourced values confirmed two more channels:

| Data ID | Signal K Path | Conversion | Notes |
|---|---|---|---|
| 48 | environment.water.temperature | celsius (new conversion type, added 2026-08-16) | H5000 raw 18.77°C vs MFD 18.7°C — near-exact match. Raw value is already Celsius, not Fahrenheit, so the existing `temperature` conversion (F→K) would have been wrong; added a dedicated `celsius` conversion (C→K) instead. |
| 125 | navigation.magneticVariation | angle | H5000 raw 5.26° vs MFD 5.2° (0.0918 rad vs 0.0908 rad) — near-exact match. |

Also resolved the long-standing GPS-source ambiguity: 421/422 (lat/lon) matches the MFD's fix within ~2-3m and is the better source; 309/310 is ~9m off (secondary/stale fix); 340/341 and 352/353 are confirmed **not** live GPS — they sit ~40km away from the boat's actual position, consistent with being a static waypoint or anchor mark.

**Known limitation:** `navigation.position` needs both latitude and longitude combined into one Signal K update, but this plugin maps each H5000 Data ID to one Signal K value independently — there's no mechanism yet to pair two IDs (e.g. 421 + 422) into a single compound update. Mapping live GPS position through this plugin would need a small architecture change; not done yet.

## Plugin rewrite (v2.0.0)

The plugin now ships a **live discovery/mapping UI** (served at `/plugins/signalk-h5000-websocket/` from the Signal K server) so future channel identification can happen directly from the boat — start a scan, compare live values against the plotter, map, save — without SSH or manual JSON editing. See the plugin's own `README.md` for details. This replaces the workflow of running one-off `h5000_scan.js` scripts over SSH that was used throughout today's troubleshooting.

## Recommended Testing Methodology
Physical trigger methods during capture windows — turning the helm, adjusting heel, comparing outputs to known reference instruments — help isolate channels through min/max spread analysis. A controlled, sustained maneuver (e.g. holding a steady speed or heading for several minutes) is far more reliable than instantaneous snapshots, since it lets you distinguish a real measured channel from a target/polar/reference channel that merely happens to be in the right range at one instant.
