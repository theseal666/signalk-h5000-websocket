# signalk-h5000-websocket

<p align="center">
  <img src="https://raw.githubusercontent.com/theseal666/signalk-h5000-websocket/main/signalK-B%26G-H5000-ingest_logo.png" alt="signalk-h5000-websocket logo" width="300">
</p>

A native Signal K server plugin designed to tap into the high-frequency telemetry stream broadcasted by the B&G H5000 CPU via its internal WebSocket interface.

By pulling data directly from the H5000 web server over Ethernet, this plugin bypasses NMEA 2000 gateway bottlenecks, allowing high-frequency metrics (like Wind Speed, Angle, Boat Speed, and Heel) to flow seamlessly into your Signal K data core for logging, instrumentation, or polar calculation. It ships with a built-in **live discovery/mapping UI** so channels can be identified and mapped from the boat by eye — compare a live-ticking value against the plotter, pick a Signal K path, save.

---

## What's new in 2.0.0

- **Fixed a `sysVal` unit-inconsistency bug.** Earlier versions used `sysVal` directly whenever the H5000 supplied it, on the assumption it was always pre-converted to SI. Live testing showed this is unreliable: depth channels report `sysVal` in feet (not meters), wind/boat-speed channels report `sysVal` as an unconverted duplicate of `val` (still knots), and some angle-like channels report `sysVal` as an unconverted duplicate of `val` (still degrees, not radians). The plugin now always converts `val` using the configured conversion type and no longer reads `sysVal` at all. This is a general GoFree protocol quirk, not specific to any one H5000 unit — expect it wherever you deploy this plugin.
- **Added a live discovery/mapping UI**, served at the plugin's own page (`/plugins/signalk-h5000-websocket/index.html` on your Signal K server, also reachable from the **Webapps** menu). It opens a short-lived, separate WebSocket scan (doesn't touch your live Signal K data) so you can watch every broadcasting ID tick in real time, compare it against the plotter, and map a Signal K path + conversion type per row with a dropdown/autocomplete — no Dev Tools, no manual JSON editing, no SSH required. Saving reconnects the production feed with the new mapping immediately.
- **Added GPS position pairing** — see [Mapping GPS position (lat/lon)](#mapping-gps-position-latlon) below.
- **Fixed a reconnect-loop bug** where saving a config (or any reconnect) could spawn a second, phantom reconnect timer that would keep tearing down and rebuilding an otherwise-healthy WebSocket connection every ~5 seconds. If you're on an older build and see the mapped connection cycling open/closed constantly in the logs even though the H5000 is reachable, update — this is almost certainly it, not a network problem.
- The classic Dev Tools discovery workflow described below still works and is a fine fallback, but the live UI is now the recommended way to map channels.

---

## Architecture Overview

```
 +-------------------------+               +-----------------------------------+
 |  B&G H5000 CPU          |               | Raspberry Pi (or Boat Server)     |
 |  Web Server             |               |                                   |
 |                         |               |  +-----------------------------+  |
 |  [WS Stream: Port 2053] |=============> |  | Signal K Server              |  |
 +-------------------------+   Ethernet/   |  | (Plugin: signalk-h5000-ws)  |  |
                               Wi-Fi       |  +-----------------------------+  |
                                           +-----------------------------------+
```

The B&G H5000 CPU exposes its internal data dictionary through Navico's GoFree Data Service on WebSocket port `2053`. The service is subscription-based: this plugin connects as a client, sends a `DataReq` subscription for every Data ID you have mapped in the Signal K UI, and receives repeating `{"Data":[...]}` batches in return. Each value's `val` field is converted to its standardized, SI-compliant Signal K path using your configured conversion type.

---

## Installing on the Pi

```bash
cd ~/.signalk
npm install signalk-h5000-websocket@latest
sudo systemctl restart signalk
```

(Or install via the Signal K admin UI's Appstore once published to npm. To install a specific branch straight from GitHub instead of npm — e.g. while testing an unreleased change — use `npm install github:theseal666/signalk-h5000-websocket#<branch>` in place of the line above.)

---

## Sensor Discovery & UI Configuration Workflow

### Recommended: the built-in Live Mapping UI (2.0.0+)

1. Open Signal K's admin UI and go to **Webapps**, or navigate directly to `http://<your-pi-ip>:3000/plugins/signalk-h5000-websocket/index.html`.
2. Confirm the H5000 IP/port at the top and click **Start scan**.
3. Watch values tick in live. Cross-check against the plotters/mast displays to identify what you're looking at.
4. Pick a Signal K path (type to autocomplete, or enter any custom path) and a conversion type from the dropdown for each channel you've confirmed.
5. Click **Save Mappings** — the plugin reconnects its production feed with the new mapping immediately.
6. Click **Stop scan** when done, or let the scan window expire (default 5 minutes) — it always auto-stops so it never runs indefinitely.

### Fallback: Discover Data IDs via Browser Developer Tools

Because every modern sailboat is equipped with a distinct set of sensors (e.g., custom linear rudder feedback, forestay load cells, mast rotation, or tank gauges), the H5000 maps variables dynamically based on how your network was commissioned.

1. Connect a laptop or nav-station computer to the boat's network and navigate to the H5000 web interface (`http://<YOUR_H5000_IP>`).
2. Press **F12** (or Right-Click → *Inspect*) to open your browser's Developer Tools.
3. Select the **Network** tab, click the **WS** (WebSockets) filter sub-tab, and reload the page.
4. Click on the active connection (typically ending in `:2053`) and select its **Messages** or **Frames** tab.
5. You will see a live, high-frequency waterfall stream of JSON packets. Actuate your target sensor (e.g., move the rudder wheel or crank the forestay tension) and note which `DataId` updates its value in real-time.

### Input Mappings Visually into Signal K (standard config screen, always available)

1. Open your Signal K Admin Portal (`http://<your-pi-ip>:3000`).
2. Navigate to **Server** → **Plugin Config** and select **B&G H5000 WebSocket Ingest** from the list.
3. Under the **Custom Sensor Mappings** array section, click **Add Item** for each telemetry channel you want to capture.
4. Fill out the visual fields:
   - **H5000 Data ID:** The numerical ID discovered using the live UI or your Dev Tools (e.g., `41` for SOG, `42` for STW).
   - **Signal K Path:** The official standard path where the metric belongs (e.g., `steering.rudderAngle`), or a custom path for data the spec does not cover (e.g., `rigging.forestay.tension`).
   - **Unit Conversion Type:** Select the mathematical translation required. Signal K strictly enforces SI base metrics internally (meters per second for speed, radians for angles/rotation, Kelvin for temperature).
     - `none` — pass-through raw value.
     - `speed` — knots to meters/second.
     - `angle` — degrees to radians.
     - `temperature` — Fahrenheit to Kelvin.
     - `celsius` — Celsius to Kelvin (for H5000 channels that report already-Celsius values, e.g. water temperature).
     - `latitude` / `longitude` — see below; pairs with another mapping to form a single position fix.
5. Click **Submit**. The plugin will instantly reload, compile your mapping dictionary, and begin feeding the standard data streams.

---

## Mapping GPS position (lat/lon)

Signal K's `navigation.position` is one atomic `{latitude, longitude}` value, but the H5000 broadcasts latitude and longitude as two separate Data IDs. To map them, create two mappings pointing at the **same** path (typically `navigation.position`), using the special `latitude` / `longitude` conversion types instead of `angle`/`speed`/etc:

| Data ID | Signal K Path | Conversion |
|---|---|---|
| *(your confirmed lat ID)* | navigation.position | latitude |
| *(your confirmed lon ID)* | navigation.position | longitude |

The plugin caches whichever half arrives first and only emits a combined position update once the other half has also arrived within the last 5 seconds — so a stale reading from one ID never gets paired with a fresh one from the other. Regular numeric mappings are unaffected by this; only `latitude`/`longitude` conversion types trigger the pairing behavior.

H5000 units are commonly seen broadcasting more than one lat/lon-shaped pair of Data IDs (e.g. a live GPS fix alongside a static waypoint or anchor mark). If you have another independent position source in Signal K (an MFD, chartplotter, or GPS puck), it's worth cross-checking candidate pairs against it before committing — a stale/static pair will diverge from your actual position over time while a live GPS pair will track it closely.

---

## General H5000 configuration tips

These are lessons that apply to **any** H5000 GoFree installation, independent of any one boat's specific wiring or sensor set:

- **`sysVal` cannot be trusted as "already SI."** Always let the plugin's `conversionType` do the conversion from `val`; don't assume `sysVal` is pre-converted (see "What's new in 2.0.0" above).
- **Data IDs are commissioned per-boat, not standardized across installs.** The same physical measurement (say, boat speed) can live at a different Data ID on two different H5000 systems, depending on how each boat's instruments were configured at commissioning. There is no universal ID table — always (re)discover channels for your own installation using the live mapping UI rather than copying another boat's mapping wholesale. See the callout below.
- **A controlled, sustained maneuver beats an instantaneous snapshot** when identifying an ambiguous channel. Holding a steady speed, heading, or angle for a couple of minutes and comparing the sustained average against a known reference (GPS SOG, a plotter reading, a physical action like turning the helm) reliably distinguishes a real measured channel from a target/polar/reference channel that merely happens to be in the right range at one instant.
- **Cross-referencing against an independent second data source** (an MFD, a separate GPS/IMU plugin, NMEA-fed instruments) is the fastest way to confirm a candidate mapping, especially for channels like water temperature, magnetic variation, or GPS position where "looks plausible" isn't enough to be sure.
- **Saving a config reconnects the production WebSocket immediately** — no full Signal K restart needed. This is expected and by design.
- **Pitch/roll (`AttitudePitch`/`AttitudeRoll`, IDs 123/124 per the vendor enum) are not guaranteed to actually broadcast** on every H5000 unit even though they're valid, documented IDs — some installs source attitude data from a separate IMU sensor instead. Don't assume silence on these IDs means something is broken; check whether your setup has (or needs) an independent attitude source.

### ⚠️ Data ID assignments are unique to each boat

> The confirmed mappings table below reflects one specific installation (this repo's own test boat, "Karukera") and its own H5000 commissioning history. **It is not a universal reference.** If you're setting this plugin up on a different boat, treat every Data ID as unknown until you've confirmed it yourself via the live scan UI (or Dev Tools fallback) against your own plotters/instruments — don't assume ID 41 is boat speed on your H5000 just because it was on someone else's.

### Confirmed mappings for this installation (as of 2026-08-16)

See `troubleshoot.md` for the full investigation history and methodology behind these. Current best-known set for this boat:

| Data ID | Signal K Path | Conversion | Notes |
|---|---|---|---|
| 41 | navigation.speedOverGround | speed | GPS-derived SOG, cross-checked against a controlled speed test. |
| 42 | navigation.speedThroughWater | speed | Confirmed via a sustained ~4.0 kn STW hold during a bridge-opening maneuver. |
| 37 | navigation.headingMagnetic | angle | Vendor `eDataType` enum confirms ID 37 as `Heading`. |
| 146 | steering.rudderAngle | angle | Vendor `eDataType` enum confirms ID 146 as `RudderAngle`. |
| 140 | environment.wind.angleApparent | angle | |
| 141 | environment.wind.angleTrueWater | angle | |
| 142 | environment.wind.directionTrue | angle | |
| 46 | environment.wind.speedApparent | speed | |
| 47 | environment.wind.speedTrue | speed | |
| 77 | environment.depth.belowTransducer | none | Already in meters on this unit. |
| 48 | environment.water.temperature | celsius | Confirmed against an independent MFD reading (18.77°C vs 18.7°C). Raw value is already Celsius on this unit, not Fahrenheit. |
| 125 | navigation.magneticVariation | angle | Confirmed against an independent MFD reading (5.26° vs 5.2°). |
| 421 / 422 | navigation.position | latitude / longitude | Best-matching live GPS pair on this unit — confirmed to ~2m of an independent MFD fix. A second lat/lon-shaped pair (309/310) was also seen but tracked ~9m off and is treated as a secondary/stale fix; two further pairs (340/341, 352/353) were confirmed static (a waypoint or anchor mark), not live GPS. |

Note: 123 (`AttitudePitch`) / 124 (`AttitudeRoll`) are the vendor-correct Data IDs for pitch/roll but were confirmed **not** to actually broadcast from this particular H5000 unit — pitch/roll are sourced from a separate IMU (racebox) plugin instead.

---

## Validation & Troubleshooting

### Data Browser Verification
Once configurations are saved and the plugin badge displays an active connection state, navigate to the **Data Browser** in the Signal K side menu. Your custom defined paths (e.g., `rigging.forestay.tension`) will stream cleanly in real-time alongside your native hardware streams, ready to be utilized by dashboard apps (like Kip or InstrumentPanel) or time-series data loggers (like InfluxDB).

### Inspecting Live Debug Messages
If variables fail to populate correctly or the connection drops:
1. Navigate to **Server** → **Debug Log** within the Signal K Web UI (or `journalctl -u signalk`, filtered for `h5000`, from the command line).
2. Put `signalk-h5000-websocket` in the search box to filter low-level logging messages.
3. You will see detailed real-time traces tracking WebSocket connections, connection retries, parsing validations, and missing ID warnings. A healthy connection logs one `connecting` → `open` pair and then stays quiet; if you see `closed, will reconnect in 5s` repeating on a steady cadence with a reachable H5000, make sure you're on 2.0.0 or later (see the reconnect-loop fix above).

### Protocol notes
- Client → server: `{"DataReq":[{"id":N,"repeat":true,"inst":0}]}`
- Server → client: `{"Data":[{id, val, sysVal, valStr, valid, damped, dampedVal}, ...]}`
- `sysVal` is not reliably SI-converted — the plugin no longer uses it (see "What's new in 2.0.0").

---

## Installation

The plugin is published on npm as [`signalk-h5000-websocket`](https://www.npmjs.com/package/signalk-h5000-websocket).

### Option 1: Signal K Appstore (recommended)
1. Open your Signal K Admin Portal (`http://<your-pi-ip>:3000`).
2. Navigate to **Appstore** → **Available** and search for `signalk-h5000-websocket`.
3. Click **Install**, then restart the server when prompted.

### Option 2: npm from the command line
SSH into your server and install the package into Signal K's configuration directory:

```bash
cd ~/.signalk
npm install signalk-h5000-websocket
sudo systemctl restart signalk
```

---

## License

MIT © Niclas Dahlgren
