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

## Data Key Mappings

The plugin automatically handles parsing and unit translation (e.g., converting Knots to Meters per Second, and Degrees to Radians) for standard metrics:

| H5000 Data ID | Metric Name | Signal K Standard Path |
| :---: | :--- | :--- |
| `1` | Boat Speed | `navigation.speedThroughWater` |
| `2` | Apparent Wind Speed | `environment.wind.speedApparent` |
| `3` | Apparent Wind Angle | `environment.wind.angleApparent` |
| `4` | True Wind Speed | `environment.wind.speedTrue` |
| `5` | True Wind Angle | `environment.wind.angleTrueGround` |
| `12` | Heading | `navigation.headingTrue` |
| `24` | Heel Angle | `navigation.attitude.roll` |

---

## Installation & Setup

Choose the installation method that matches your Signal K deployment layout.

### Option 1: Raw (Bare-Metal) Installation
Use this if Signal K is installed directly on your Raspberry Pi OS via standard Node/NPM scripts.

1. **Access your server:** SSH into your Raspberry Pi.
   ```bash
   ssh pi@your-boat-pi.local

```

2. **Navigate to the active Signal K configuration directory:**
By default, Signal K stores global plugins inside its local application directory structure.
```bash
cd ~/.signalk/node_modules/

```


3. **Clone or create the plugin directory:**
```bash
mkdir signalk-h5000-websocket
cd signalk-h5000-websocket

```


4. **Populate the plugin files:**
Place your production `package.json` and `index.js` files directly inside this new folder.
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

If you run Signal K inside a Docker container (e.g., via the official `signalk/signalk-server` image), local plugins must be injected into the volume mapped to the container's `/home/node/.signalk` directory.

#### Step 1: Locate your local volume mapping

Examine your `docker-compose.yml` file or your `docker run` command to find where your host directory bridges to the container. A standard configuration usually maps like this:

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

#### Step 2: Inject the Plugin onto the Host Machine

1. On your host system, navigate to the persistent storage directory bound to the container (using the example above, `./signalk-data`):
```bash
cd /path/to/your/docker-compose/signalk-data

```


2. Move into the container's persistent `node_modules` directory:
```bash
cd node_modules/

```


3. Create the folder structure and add your code:
```bash
mkdir signalk-h5000-websocket
cd signalk-h5000-websocket
# Add your package.json and index.js into this folder

```



#### Step 3: Install dependencies via Container Execution

Because the host environment might run a different architecture or Node version than the container, trigger the dependency installation *inside* the running environment:

1. Bring your container stack up (if it isn't already):
```bash
docker-compose up -d

```


2. Execute npm install directly inside the container context:
```bash
docker-compose exec signalk-server npm install --prefix /home/node/.signalk/node_modules/signalk-h5000-websocket --production

```



#### Step 4: Restart the Container

Apply changes by bouncing the container profile:

```bash
docker-compose restart signalk-server

```

---

## Configuration

1. Launch your Signal K Management Portal by opening your browser and pointing it to `http://<your-pi-ip>:3000`.
2. Authenticate and navigate to **Server** -> **Plugin Config**.
3. Select **B&G H5000 WebSocket Ingest** from the menu list.
4. Provide the configuration parameters:
* **H5000 CPU IP Address:** The actual static IP assigned to your B&G CPU (e.g., `192.168.1.100` or `192.168.77.1`).
* **H5000 WebSocket Port:** Hardcoded to `2053` by default on Navico setups.


5. Click **Submit** to commit the settings. The plugin will connect immediately and update its connection health badge.

---

## Troubleshooting

### Inspecting Live Debug Messages

If you aren't seeing values show up in the Signal K Data Browser, you can explicitly watch the plugin's debug statements.

1. In the Signal K Web UI, navigate to **Server** -> **Debug Log**.
2. Type `signalk-h5000-websocket` into the filter box to trace active raw packets, frame parser activity, or reconnection retries.

### Checking the CPU Interface

Ensure your server can ping the H5000 engine over your network. If the connection fails consistently, open a web browser on your computer connected to the same network and verify you can access the H5000 internal web interface home page at `http://<YOUR_H5000_IP>`.

```

```