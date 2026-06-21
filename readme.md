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

The B&G H5000 CPU streams its internal data dictionary as JSON objects over WebSocket port `2053`. This plugin connects as a client, translates the proprietary Navico `DataId` identifiers into standardized, SI-compliant Signal K paths, and commits them directly to the server's delta stream.

---

## Sensor Discovery & Mapping Workflow

Because every sailboat has a unique array of sensors (such as linear rudder feedback, forestay load cells, or mast rotation indicators), the H5000 maps custom variables dynamically based on how your network was commissioned. Use this workflow to dynamically map your entire system:

### 1. Discover Data IDs via Browser Developer Tools
1. Connect a computer to the boat's network and navigate to the H5000 interface (`http://<YOUR_H5000_IP>`).
2. Press **F12** (or Right-Click -> *Inspect*) to open your browser's Developer Tools.
3. Select the **Network** tab, click the **WS** (WebSockets) filter sub-tab, and reload the page.
4. Click on the active socket stream connection (typically ending in `:2053`) and select its **Messages** or **Frames** tab.
5. You will see a fast waterfall stream of JSON packets. Actuate your target sensor (e.g., move the rudder wheel or tension the forestay) and observe which `DataId` updates in real-time.

### 2. Append Maps to `index.js`
Open your plugin's `index.js` file and find the `H5000_TO_SIGNALK` object. Add your newly discovered `DataId`, choose its standard Signal K dot-notation path, and match it to a unit transformation `type` (`speed`, `angle`, or `tension_lbs`).

```javascript
const H5000_TO_SIGNALK = {
  // --- Core Navigation & Performance Metrics ---
  1:   { path: 'navigation.speedThroughWater', type: 'speed' },
  2:   { path: 'environment.wind.speedApparent', type: 'speed' },
  3:   { path: 'environment.wind.angleApparent', type: 'angle' },
  24:  { path: 'navigation.attitude.roll', type: 'angle' },              // Heel

  // --- Advanced Sensor Hardware (Steering & Rigging Example) ---
  15:  { path: 'steering.rudderAngle', type: 'angle' },                  // Linear Rudder Sensor
  42:  { path: 'propulsion.mast.forestayTension', type: 'tension_lbs' }  // Forestay Loadcell (Lbs -> N)
};
```

---

## Installation & Setup

Choose the deployment method matching your Signal K installation profile.

### Option 1: Raw (Bare-Metal) Installation
Use this if Signal K is installed directly on your Raspberry Pi OS environment.

1. **Access your server:** SSH into your Raspberry Pi.
   ```bash
   ssh pi@your-boat-pi.local
   ```

2. **Navigate to the active Signal K configuration directory:**
   ```bash
   cd ~/.signalk/node_modules/
   ```

3. **Create the plugin directory:**
   ```bash
   mkdir signalk-h5000-websocket
   cd signalk-h5000-websocket
   ```

4. **Populate the plugin files:** Drop your updated `package.json` and customized `index.js` files inside this folder.

5. **Install production dependencies:**
   ```bash
   npm install --production
   ```

6. **Restart the Signal K Engine:**
   ```bash
   sudo systemctl restart signalk-server
   ```

---

### Option 2: Signal K inside Docker Installation
If you run Signal K inside a Docker container (e.g., using the `signalk/signalk-server` image), plugins must be stored inside the persistent data directory mapped to the container's `/home/node/.signalk` workspace.

#### Step 1: Locate your persistent data folder
Examine your `docker-compose.yml` configuration to find your local volume location. A typical setup looks like this:

```yaml
version: '3.7'
services:
  signalk-server:
    image: signalk/signalk-server:latest
    ports:
      - "3000:3000"
    volumes:
      - ./signalk-data:/home/node/.signalk
    restart: unless-stopped
```

#### Step 2: Create the Plugin Folder on the Host
1. On your host system, navigate to your persistent volume context:
   ```bash
   cd /path/to/your/docker-compose/signalk-data/node_modules
   ```
2. Build the directory path and paste your code files:
   ```bash
   mkdir signalk-h5000-websocket
   cd signalk-h5000-websocket
   # Save your package.json and your index.js files right here
   ```

#### Step 3: Compile Dependencies inside the Container Context
To maintain architecture compatibility, let the container run the compilation lifecycle:
```bash
docker-compose exec signalk-server npm install --prefix /home/node/.signalk/node_modules/signalk-h5000-websocket --production
```

#### Step 4: Restart the Container Profile
Apply all folder bindings and restart the runtime process:
```bash
docker-compose restart signalk-server
```

---

## Configuration & Validation

1. Open your web browser and navigate to your Signal K Management Portal (`http://<your-pi-ip>:3000`).
2. Navigate to **Server** -> **Plugin Config**.
3. Select **B&G H5000 WebSocket Ingest** from the side-rail navigation.
4. Input your specific environment parameters:
   * **H5000 CPU IP Address:** The target static IP belonging to your H5000 CPU.
   * **H5000 WebSocket Port:** Fixed by default at `2053`.
5. Click **Submit**. 
6. **Validation:** Open the Signal K **Data Browser** in the server UI. Your live custom telemetry definitions (e.g., `propulsion.mast.forestayTension`) will immediately populate alongside your standard hardware stream components, automatically translated into correct SI base units.

---

## Troubleshooting

### Inspecting Live Debug Messages
If metrics aren't compiling cleanly down the data tree:
1. Navigate to **Server** -> **Debug Log** within the Web UI.
2. Put `signalk-h5000-websocket` in the search box to watch low-level packet capture, pipeline handshakes, connection errors, or translation validation metrics in real time.