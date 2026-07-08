# signalk-h5000-websocket

A native Signal K server plugin designed to tap into the high-frequency telemetry stream broadcasted by the B&G H5000 CPU via its internal WebSocket interface. 

By pulling data directly from the H5000 web server over Ethernet, this plugin bypasses NMEA 2000 gateway bottlenecks, allowing high-frequency metrics (like Wind Speed, Angle, Boat Speed, and Heel) to flow seamlessly into your Signal K data core for logging, instrumentation, or polar calculation.

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

The B&G H5000 CPU exposes its internal data dictionary through Navico's GoFree Data Service on WebSocket port `2053`. The service is subscription-based: this plugin connects as a client, sends a `DataReq` subscription for every Data ID you have mapped in the Signal K UI, and receives repeating `{"Data":[...]}` batches in return. Each value is translated to its standardized, SI-compliant Signal K path and committed to the server's delta stream. When the H5000 supplies a `sysVal` (already in SI units) it is used directly; otherwise the display value is converted using your configured conversion type.

---

## Sensor Discovery & UI Configuration Workflow

Because every modern sailboat is equipped with a distinct set of sensors (e.g., custom linear rudder feedback, forestay load cells, mast rotation, or tank gauges), the H5000 maps variables dynamically based on how your network was commissioned. This plugin provides a completely code-free configuration panel built directly into the Signal K Web UI.

### Step 1: Discover Data IDs via Browser Developer Tools
1. Connect a laptop or nav-station computer to the boat's network and navigate to the H5000 web interface (`http://<YOUR_H5000_IP>`).
2. Press **F12** (or Right-Click -> *Inspect*) to open your browser's Developer Tools.
3. Select the **Network** tab, click the **WS** (WebSockets) filter sub-tab, and reload the page.
4. Click on the active connection (typically ending in `:2053`) and select its **Messages** or **Frames** tab.
5. You will see a live, high-frequency waterfall stream of JSON packets. Actuate your target sensor (e.g., move the rudder wheel or crank the forestay tension) and note which `DataId` updates its value in real-time.

### Step 2: Input Mappings Visually into Signal K
1. Open your Signal K Admin Portal (`http://<your-pi-ip>:3000`).
2. Navigate to **Server** -> **Plugin Config** and select **B&G H5000 WebSocket Ingest** from the list.
3. Under the **Custom Sensor Mappings** array section, click **Add Item** for each telemetry channel you want to capture.
4. Fill out the visual fields:
   * **H5000 Data ID:** The numerical ID discovered using your Dev Tools (e.g., `15` for rudder angle, `42` for forestay).
   * **Signal K Path:** The official standard path where the metric belongs (e.g., `steering.rudderAngle`), or a custom path for data the spec does not cover (e.g., `rigging.forestay.tension`).
   * **Unit Conversion Type:** Select the mathematical math-parser translation required. *Note: Signal K strictly enforces SI base metrics internally (Meters per Second for speed, Radians for angles/rotation, and Newtons for rigging tension).*
     * *No Conversion:* Pass-through raw value.
     * *Knots to Meters/Second:* For boat speed or wind speed metrics.
     * *Degrees to Radians:* For angles, heading, leeway, or roll.
     * *Pounds-Force to Newtons:* For strain gauges and rig load cells.
5. Click **Submit**. The plugin will instantly reload, compile your mapping dictionary, and begin feeding the standard data streams.

---

## Installation

The plugin is published on npm as [`signalk-h5000-websocket`](https://www.npmjs.com/package/signalk-h5000-websocket).

### Option 1: Signal K Appstore (recommended)
1. Open your Signal K Admin Portal (`http://<your-pi-ip>:3000`).
2. Navigate to **Appstore** -> **Available** and search for `signalk-h5000-websocket`.
3. Click **Install**, then restart the server when prompted.

### Option 2: npm from the command line
SSH into your server and install the package into Signal K's configuration directory:

```bash
cd ~/.signalk
npm install signalk-h5000-websocket
sudo systemctl restart signalk-server
```

---

## Validation & Troubleshooting

### Data Browser Verification
Once configurations are saved and the plugin badge displays an active connection state, navigate to the **Data Browser** in the Signal K side menu. Your custom defined paths (e.g., `rigging.forestay.tension`) will stream cleanly in real-time alongside your native hardware streams, ready to be utilized by dashboard apps (like Kip or InstrumentPanel) or time-series data loggers (like InfluxDB).

### Inspecting Live Debug Messages
If variables fail to populate correctly or the connection drops:
1. Navigate to **Server** -> **Debug Log** within the Signal K Web UI.
2. Put `signalk-h5000-websocket` in the search box to filter low-level logging messages.
3. You will see detailed real-time traces tracking web socket server connections, connection retries, parsing validations, and missing ID warnings.
