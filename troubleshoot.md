# H5000 WebSocket Troubleshooting Summary

_Last updated: 2026-08-16 — includes results from a live bridge-opening speed test, cross-reference against the H5000's own vendor `eDataType` JavaScript enum, and an MFD cross-check._

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
| 37 | navigation.headingMagnetic | angle | ✅ **CONFIRMED — final.** Vendor `eDataType` enum (extracted from the H5000's own JS) identifies ID 37 as `Heading`. Earlier candidates (221, 9, 39) were statistically plausible but not vendor-backed; 37 is now the sole heading source. **Note (2026-08-16 live config check):** the plugin's live config currently maps ID 37 to `navigation.headingTrue`, not `navigation.headingMagnetic` as documented here — worth confirming in person against the compass/plotter which this channel actually is, and correcting either the mapping or this note to match. |
| 146 | steering.rudderAngle | angle | ✅ **CONFIRMED — final, replaces earlier wrong guess.** ID 228 (used yesterday) was confirmed wrong by the user and removed. Vendor enum identifies ID 146 as `RudderAngle`; ID 228 is actually `TargetTrueWindAngle`. 146 is wired into the live config as the sole rudder source. |
| 140 | environment.wind.angleApparent | angle | ✅ Confirmed, matches conditions throughout. |
| 141 | environment.wind.angleTrueWater | angle | ✅ Vendor-confirmed label, tracks consistently. |
| 142 | environment.wind.directionTrue | angle | ✅ Confirmed 2026-08-16 — reclassified from headingMagnetic after sailing a 160-170° course showed this channel reading 283°, ~120° off for heading but a great fit for TWD. User cross-checked against the live instrument reading ("270-ish") — 278.0° matched. |
| 46 | environment.wind.speedApparent | speed | ✅ Confirmed, matches conditions. |
| 47 | environment.wind.speedTrue | speed | ✅ Confirmed, matches conditions. |
| 77 | environment.depth.belowTransducer | none (already meters) | ✅ Confirmed. Previously showed ~3.3x inflated due to the sysVal-in-feet bug; correct since the fix. Possible small (~0.3m) offset relative to actual transducer depth suspected — not yet corrected via `BoatSpeedCorrection`-style offset setting. |

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

- **GPS-like pairs** (lat/lon, `valStr` in degree-minute format): 309/310, 340/341, 352/353, 421/422. 309/310 and 421/422 move consistently with live boat speed (confirmed live position feeds). 340/341 and 352/353 stayed static across scans — likely a waypoint or anchor mark, not live GPS. **Resolved below** — 421/422 selected as the live source.
- **IDs 355–361**: still unidentified, timer/counter-shaped values (HH:MM:SS or small decimals), mostly zero at rest.
- Temperature channel: **resolved below** (ID 48).
- Trip vs. total log distance distinction: still unidentified (candidates among the large unmapped numeric IDs like 27, 382, 467, 468 which all move together — possibly log/trip distance in some raw unit).

## Outstanding Verification Tasks
- IDs 355–361 (timer-related, unresolved).
- Trip/total log distance channel — still unresolved (MFD's `navigation.trip.log` reads 0 at the dock, so there's no nonzero ground truth to correlate against yet — revisit once underway).
- ID 37 (`navigation.headingTrue` vs `navigation.headingMagnetic`) — confirm which the vendor `Heading` channel actually reports; see note in the Confirmed Signal Mappings table above.
- Depth ~0.3m transducer offset — confirm and, if real, apply a correction (either in the plugin or via the H5000's own device settings, e.g. an `eDeviceSettingId`-style offset).
- **Remote day/night mode control** — see new section below.

## Confirmed via MFD cross-check (2026-08-16)

A second connector (the boat's MFD, NMEA-fed) was added to Signal K, which gives independent ground-truth values for several paths. Cross-checking unmapped H5000 IDs against those MFD-sourced values confirmed two more channels:

| Data ID | Signal K Path | Conversion | Notes |
|---|---|---|---|
| 48 | environment.water.temperature | celsius (new conversion type, added 2026-08-16) | H5000 raw 18.77°C vs MFD 18.7°C — near-exact match. Raw value is already Celsius, not Fahrenheit, so the existing `temperature` conversion (F→K) would have been wrong; added a dedicated `celsius` conversion (C→K) instead. Added to the live config 2026-08-16 — confirmed live (291.86K vs MFD's 291.85K). |
| 125 | navigation.magneticVariation | angle | H5000 raw 5.26° vs MFD 5.2° (0.0918 rad vs 0.0908 rad) — near-exact match. Added to the live config 2026-08-16 — confirmed live. |

Also resolved the long-standing GPS-source ambiguity: 421/422 (lat/lon) matches the MFD's fix within ~2-3m and is the better source; 309/310 is ~9m off (secondary/stale fix); 340/341 and 352/353 are confirmed **not** live GPS — they sit ~40km away from the boat's actual position, consistent with being a static waypoint or anchor mark. 421/422 mapped into `navigation.position` via the plugin's lat/lon-pairing feature (2.0.0) and confirmed live against the MFD to ~1m.

**Previous known limitation, now resolved:** `navigation.position` needs both latitude and longitude combined into one Signal K update, but this plugin used to map each H5000 Data ID to one Signal K value independently — there was no mechanism to pair two IDs (e.g. 421 + 422) into a single compound update. This has been implemented in 2.0.0 via a `positionCache` that pairs a `latitude`/`longitude` conversion-type mapping sharing the same Signal K path — see the plugin's own `readme.md` for usage.

## Plugin rewrite (v2.0.0)

The plugin now ships a **live discovery/mapping UI** (served at `/plugins/signalk-h5000-websocket/` from the Signal K server) so future channel identification can happen directly from the boat — start a scan, compare live values against the plotter, map, save — without SSH or manual JSON editing. See the plugin's own `readme.md` for details. This replaces the workflow of running one-off `h5000_scan.js` scripts over SSH that was used throughout today's troubleshooting.

## Recommended Testing Methodology
Physical trigger methods during capture windows — turning the helm, adjusting heel, comparing outputs to known reference instruments — help isolate channels through min/max spread analysis. A controlled, sustained maneuver (e.g. holding a steady speed or heading for several minutes) is far more reliable than instantaneous snapshots, since it lets you distinguish a real measured channel from a target/polar/reference channel that merely happens to be in the right range at one instant.

## UNVERIFIED LEAD: remote day/night mode control (2026-08-16)

While investigating whether the H5000's displays could be switched between day/night mode remotely, pulled the H5000's own web app JS (`http://192.168.1.104/js/{hobart,util,H5000WebSocket}.js`) — the same technique used to originally discover Data IDs, applied to a write/command channel instead of the read-only one this plugin uses.

Findings:

- The GoFree WebSocket protocol has a **second message type beyond `DataReq`/`Data`**: a `Setting` write command, shaped `{"Setting": [{"id": <settingId>, "value": <value>}]}`, sent the same way `DataReq` is (`this.Send(obj)` over the same open WebSocket). Implemented as `this.setSetting = function (key, value)` in `H5000WebSocket.js`.
- The vendor's own `eSettingId` enum (separate from the `eDataType`/Data ID enum used for telemetry) includes: `GoFreeVersion: 0`, `BacklightLevel: 1`, **`NightMode: 2`**, `TripLog1: 3`, `TripLog2: 4`, `RaceTimerRolling: 5`, `RaceTimerStartTrip: 6`, `RaceTimerValue: 7`, `DampingWind: 8`, `DampingBoatSpeed: 9`, `DampingHeading: 10`, `DampingCog: 11`, `DampingSog: 12`, `BoatSpeedCorrection: 13`, `TemperatureUnits: 14`, plus more (there's also a separate `eDeviceSettingId` enum for per-device settings like compass offset, backlight colour, display group assignment, analog channel types — not explored yet).
- **Not yet confirmed:** nothing in the H5000 web app's own bundled JS actually calls `setSetting(eSettingId.NightMode, ...)` anywhere — no UI toggle references it. So the command's *existence* is vendor-confirmed (it's in their own enum), but the *expected value type* (boolean `true`/`false` vs `0`/`1`) and *whether it actually propagates to the physical mast/cockpit display heads* (vs. being something only those units' own physical menus control locally) are both unverified.
- This plugin currently only ever sends `DataReq` (read subscriptions) — it has never sent a `Setting` write. Implementing this would be new functionality, not a fix to anything existing.

**Next step, next time aboard:** with someone able to watch the physical displays, try sending `{"Setting":[{"id":2,"value":true}]}` (then `false`) over a raw WebSocket connection to `ws://192.168.1.104:2053` and observe whether any display actually changes. If it works, `BacklightLevel` (id 1) and the damping settings (ids 8–12, which currently have no live-UI equivalent — they can only be tuned via the H5000's own physical menus today) are natural next candidates for the same treatment.

### Read-only follow-up (2026-08-16, later same day): `NightMode`/`BacklightLevel` are not exposed as global settings on this unit

Before ever attempting a `Setting` write, did a purely read-only check first: the protocol also has a `SettingInfoReq` message (`{"SettingInfoReq":{"keys":[...]}}`, found in `H5000WebSocket.js` alongside `setSetting`) that asks the H5000 to describe a setting — its name, type, current value, and valid range — without changing anything. Sent `{"SettingInfoReq":{"keys":[0,1,2,3,8,9,10,13,14]}}` directly from the Pi (via a throwaway `node -e` script using the `ws` package already vendored in this plugin's `node_modules`) and got back real schema data for IDs **0** (GoFree Version — this unit reports `v2/bg_hbt-v1`), **8/9/10** (True Wind Direction / Boat Speed / Heading damping, type 3 = numeric slider 0–9), **13** (Boat Speed Heel Correction — a full 2D correction table, type 4), and **14** (Temperature Unit — type 1 = dropdown, Celsius/Fahrenheit).

**IDs 1 (`BacklightLevel`) and 2 (`NightMode`) were silently absent from the response** — not an error, just not included, even though 3 (`TripLog1`) was also absent while its listed neighbors answered fine. That's a meaningful negative result: on this H5000 unit/firmware, night mode and backlight don't appear to be exposed as global system settings queryable this way. Plausible explanations, none confirmed: (a) this firmware version doesn't support remote control of them at all, (b) they're controlled per physical display head via the separate `eDeviceSettingId` enum (which includes `HVDisplay_BacklightColour` and similar per-device fields) rather than as a single system-wide setting, requiring a specific device/instance target we haven't identified, or (c) they simply require a different request shape than what's been tried.

**Practical takeaway for now:** don't expect a quick remote day/night toggle to work out of the box. Before investing more time in a `Setting` write attempt, it's worth first trying a `SettingInfoReq` for a range of `eDeviceSettingId` values against a specific display's instance/n2kName (once one is identified via a live scan) to see if backlight/night-mode metadata shows up at the per-device level instead of the global level tried here.
