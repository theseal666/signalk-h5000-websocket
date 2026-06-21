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

The B&G H5000 CPU streams its internal data dictionary as JSON objects over WebSocket port `2053`. This plugin connects as a client, reads your custom mapping configurations directly from the Signal K UI, translates the proprietary Navico `DataId` identifiers into standardized, SI-compliant Signal K paths, and commits them to the server's delta stream.

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
   * **Signal K Path:** The official standard path where the metric belongs (e.g., `steering.rudderAngle` or `propulsion.mast.forestayTension`).
   * **Unit Conversion Type:** Select the mathematical math-parser translation required. *Note: Signal K strictly enforces SI base metrics internally (Meters per Second for speed, Radians for angles/rotation, and Newtons for rigging tension).*
     * *No Conversion:* Pass-through raw value.
     * *Knots to Meters/Second:* For boat speed or wind speed metrics.
     * *Degrees to Radians:* For angles, heading, leeway, or roll.
     * *Pounds-Force to Newtons:* For strain gauges and rig load cells.
5. Click **Submit**. The plugin will instantly reload, compile your mapping dictionary, and begin feeding the standard data streams.

---

## Installation & Setup

Choose the installation method that matches your Signal K deployment layout.

### Option 1: Raw (Bare-Metal) Installation
Use this if Signal K is installed directly on your Raspberry Pi OS application layer via Node/NPM.

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

4. Clone the repository via Git:
   ```bash
   git clone https://github.com/theseal666/signalk-h5000-websocket.git
   cd signalk-h5000-websocket
   
   ```
   
6. **Install production dependencies:**
   ```bash
   npm install --production
   ```

7. **Restart the Signal K Engine:**
   ```bash
   sudo systemctl restart signalk-server
   ```

---

### Option 2: Signal K inside Docker Installation
If you run Signal K inside an isolated Docker container (e.g., via the official `signalk/signalk-server` image), plugins must be injected into the host volume folder mapped to the container's persistent `/home/node/.signalk` workspace.

#### Step 1: Locate your host volume mapping
Examine your container's `docker-compose.yml` configuration to find your persistent data storage path. A standard configuration typically bridges like this:

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

#### Step 2: Create the Plugin Folder on the Host Machine
1. On your host system, navigate to the persistent volume folder context:
   ```bash
   cd /path/to/your/docker-compose/signalk-data/node_modules
   ```
2. Build the directory path and paste your code files:
   ```bash
   git clone https://github.com/theseal666/signalk-h5000-websocket.git
   cd signalk-h5000-websocket
   ```

#### Step 3: Compile Dependencies inside the Container Context
To maintain architecture and node-version binary compatibility, execute the package dependency installer contextually inside the container layer:
```bash
docker-compose exec signalk-server npm install --prefix /home/node/.signalk/node_modules/signalk-h5000-websocket --production
```

#### Step 4: Restart the Container Profile
Breathe changes into the stack by bouncing the runtime service:
```bash
docker-compose restart signalk-server
```

---

## Validation & Troubleshooting

### Data Browser Verification
Once configurations are saved and the plugin badge displays an active connection state, navigate to the **Data Browser** in the Signal K side menu. Your custom defined paths (e.g., `propulsion.mast.forestayTension`) will stream cleanly in real-time alongside your native hardware streams, ready to be utilized by dashboard apps (like Kip or InstrumentPanel) or time-series data loggers (like InfluxDB).

### Inspecting Live Debug Messages
If variables fail to populate correctly or the connection drops:
1. Navigate to **Server** -> **Debug Log** within the Signal K Web UI.
2. Put `signalk-h5000-websocket` in the search box to filter low-level logging messages.
3. You will see detailed real-time traces tracking web socket server connections, connection retries, parsing validations, and missing ID warnings.
