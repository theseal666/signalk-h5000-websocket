# signalk-h5000-websocket

Bridges a B&G H5000 CPU's GoFree Data Service WebSocket (`ws://<ip>:2053`) into Signal K, with a built-in **live discovery/mapping UI** so channels can be identified and mapped from the boat by eye — compare a live-ticking value against the plotter, pick a Signal K path, save.

## What changed in 2.0.0

- **Fixed the `sysVal` bug.** Earlier versions trusted `sysVal` as "already SI" when present. Live testing on 2026-08-16 showed this is unreliable across several channel types (depth in feet instead of meters, wind/speed channels duplicating `val` unconverted, some angle channels duplicating `val` in degrees instead of radians). The plugin now always converts `val` using the configured `conversionType` and never reads `sysVal`.
- **Added a live mapping UI**, served at the plugin's own page (`/plugins/signalk-h5000-websocket/` under your Signal K server, or reachable via the "Webapps" menu). It:
  - Opens a short-lived, separate WebSocket scan (default IDs 0–599, default 5-minute window) that does **not** touch your live Signal K data — it's purely for discovery.
  - Shows every ID currently broadcasting, with a live-updating value, a known vendor label where we've confirmed one, and a Signal K path / conversion-type dropdown per row.
  - Lets you save directly from the browser — no manual JSON editing, no SSH needed. Saving updates the plugin config and reconnects the "production" WebSocket connection (the one that actually feeds Signal K) with the new mapping list, without needing a full Signal K restart.
- The original config screen (IP/port/raw mapping array) still exists as a fallback under Signal K's standard "Plugin Config" screen, but the live UI is the recommended way to edit mappings.

## Mapping GPS position (lat/lon)

Signal K's `navigation.position` is one atomic `{latitude, longitude}` value, but the H5000 broadcasts latitude and longitude as two separate Data IDs. To map them, create two mappings pointing at the **same** path (typically `navigation.position`), using the special `latitude` / `longitude` conversion types instead of `angle`/`speed`/etc:

| Data ID | Signal K Path | Conversion |
|---|---|---|
| 421 (or your confirmed lat ID) | navigation.position | latitude |
| 422 (or your confirmed lon ID) | navigation.position | longitude |

The plugin caches whichever half arrives first and only emits a combined position update once the other half has also arrived within the last 5 seconds — so a stale reading from one ID never gets paired with a fresh one from the other. Regular numeric mappings are unaffected by this; only `latitude`/`longitude` conversion types trigger the pairing behavior.

## Installing on the Pi

```bash
cd ~/.signalk
npm install signalk-h5000-websocket@latest
sudo systemctl restart signalk
```

(Or install via the Signal K admin UI's Appstore once published to npm.)

## Using the live mapping UI

1. Open Signal K's admin UI → **Webapps** (or navigate directly to `http://<pi-ip>:3000/plugins/signalk-h5000-websocket/`).
2. Confirm the H5000 IP/port at the top and click **Start scan**.
3. Watch values tick in. Cross-check against the plotters/mast displays for whatever you're trying to identify (course, wind angle, boat speed, etc.).
4. Once you've confirmed an ID, pick its Signal K path and conversion type from the dropdowns in that row.
5. Click **Save Mappings**. The plugin reconnects its production WebSocket with the new mapping list immediately.
6. Click **Stop scan** when you're done (or just let the scan window expire — it auto-stops after the configured duration so it doesn't run indefinitely).

## Confirmed mappings (as of 2026-08-16)

See `troubleshoot.md` for the full history. Current best-known set:

| Data ID | Signal K Path | Conversion |
|---|---|---|
| 41 | navigation.speedOverGround | speed |
| 42 | navigation.speedThroughWater | speed |
| 37 | navigation.headingMagnetic | angle |
| 146 | steering.rudderAngle | angle |
| 140 | environment.wind.angleApparent | angle |
| 141 | environment.wind.angleTrueWater | angle |
| 142 | environment.wind.directionTrue | angle |
| 46 | environment.wind.speedApparent | speed |
| 47 | environment.wind.speedTrue | speed |
| 77 | environment.depth.belowTransducer | none |

Note: 123 (AttitudePitch) / 124 (AttitudeRoll) are the vendor-correct IDs for pitch/roll but were confirmed **not** to actually broadcast from this particular H5000 unit — pitch/roll are sourced from a separate IMU (racebox) plugin instead.

## Protocol notes

- Client → server: `{"DataReq":[{"id":N,"repeat":true,"inst":0}]}`
- Server → client: `{"Data":[{id, val, sysVal, valStr, valid, damped, dampedVal}, ...]}`
- `sysVal` is not reliably SI-converted — do not use it (see above).
