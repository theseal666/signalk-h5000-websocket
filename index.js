const WebSocket = require('ws');

module.exports = function (app) {
  let plugin = {};
  let ws = null;
  let reconnectTimer = null;

  plugin.id = 'signalk-h5000-websocket';
  plugin.name = 'B&G H5000 WebSocket Ingest';
  plugin.description = 'Ingests high-frequency telemetry directly from the B&G H5000 CPU webserver.';

  // Define plugin configuration schema visible in the Signal K Admin UI
  plugin.schema = {
    type: 'object',
    required: ['ipAddress', 'port'],
    properties: {
      ipAddress: {
        type: 'string',
        title: 'H5000 CPU IP Address',
        default: '192.168.1.100'
      },
      port: {
        type: 'number',
        title: 'H5000 WebSocket Port',
        default: 2053
      }
    }
  };

  /**
   * CENTRAL DATA-ID DICTIONARY MAPPING
   * * To add custom load cells, tanks, or linear sensors:
   * 1. Discover the DataId using your browser's F12 Dev Tools Network waterfall.
   * 2. Append the ID to this lookup list.
   * 3. Assign an official Signal K dot-notation path and its unit conversion type.
   * * NOTE: Signal K strictly enforces SI Units:
   * - Speed: Meters per second (m/s)
   * - Angles/Rotation: Radians (rad)
   * - Load/Force: Newtons (N)
   */
  const H5000_TO_SIGNALK = {
    // --- Core Navigation & Performance Metrics ---
    1:   { path: 'navigation.speedThroughWater', type: 'speed' },          // Boat Speed (Knots -> m/s)
    2:   { path: 'environment.wind.speedApparent', type: 'speed' },         // Apparent Wind Speed (Knots -> m/s)
    3:   { path: 'environment.wind.angleApparent', type: 'angle' },         // Apparent Wind Angle (Deg -> Rad)
    4:   { path: 'environment.wind.speedTrue', type: 'speed' },             // True Wind Speed (Knots -> m/s)
    5:   { path: 'environment.wind.angleTrueGround', type: 'angle' },       // True Wind Angle (Deg -> Rad)
    12:  { path: 'navigation.headingTrue', type: 'angle' },                // Heading (Deg -> Rad)
    24:  { path: 'navigation.attitude.roll', type: 'angle' },              // Heel Angle (Deg -> Rad)
    25:  { path: 'navigation.attitude.pitch', type: 'angle' },             // Trim/Pitch Angle (Deg -> Rad)
    51:  { path: 'navigation.leewayAngle', type: 'angle' },                // Leeway Angle (Deg -> Rad)

    // --- Advanced Sensor Hardware (Steering & Rigging) ---
    15:  { path: 'steering.rudderAngle', type: 'angle' },                  // Linear Rudder Sensor (Deg -> Rad)
    32:  { path: 'steering.mastRotationAngle', type: 'angle' },            // Mast Rotation sensor (Deg -> Rad)
    42:  { path: 'propulsion.mast.forestayTension', type: 'tension_lbs' }, // Forestay Loadcell (Lbs-Force -> Newtons)
    43:  { path: 'propulsion.mast.shroudTensionPort', type: 'tension_lbs' },// Port Shroud Loadcell
    44:  { path: 'propulsion.mast.shroudTensionStbd', type: 'tension_lbs' }// Starboard Shroud Loadcell
  };

  /**
   * Helper function to safely execute mathematical adjustments
   * from proprietary Navico scales to standardized Signal K SI base metrics.
   */
  function convertValue(val, type) {
    if (typeof val !== 'number' || isNaN(val)) return null;

    switch (type) {
      case 'speed':
        return val * 0.514444; // Convert Knots to Meters per Second
      case 'angle':
        return val * (Math.PI / 180); // Convert Degrees to Radians
      case 'tension_lbs':
        return val * 4.44822; // Convert Pounds-Force (lbf) to Newtons (N)
      default:
        return val; // Default fallback: Pass-through raw value
    }
  }

  plugin.start = function (options, restartPlugin) {
    app.handleMessage(plugin.id, { info: 'Initializing B&G H5000 WebSocket Feed' });

    function connect() {
      const url = `ws://${options.ipAddress}:${options.port}`;
      app.debug(`Opening pipeline connection directly to H5000 CPU at: ${url}`);

      ws = new WebSocket(url);

      ws.on('open', () => {
        app.setPluginStatus(`Successfully streaming data from H5000 at ${options.ipAddress}`);
        app.debug('WebSocket stream connected and handshaking completed.');
      });

      ws.on('message', (data) => {
        try {
          const packet = JSON.parse(data);
          const dataId = packet.DataId;
          
          // Ensure the packet has a mapping entry and contains a valid sensor state flag
          if (dataId && H5000_TO_SIGNALK[dataId] && packet.Valid !== false) {
            const mapping = H5000_TO_SIGNALK[dataId];
            const skValue = convertValue(packet.Value, mapping.type);

            if (skValue !== null) {
              // Build standard immutable Signal K delta transaction object
              const delta = {
                updates: [
                  {
                    source: {
                      label: 'h5000-websocket',
                      type: 'Ethernet',
                      talker: 'B&G'
                    },
                    timestamp: new Date().toISOString(),
                    values: [
                      {
                        path: mapping.path,
                        value: skValue
                      }
                    ]
                  }
                ]
              };

              // Inject the telemetry directly into the Signal K data core
              app.handleMessage(plugin.id, delta);
            }
          }
        } catch (err) {
          app.debug(`Muted packet exception or malformed JSON structure: ${err.message}`);
        }
      });

      ws.on('close', () => {
        app.setPluginStatus('H5000 stream lost. Attempting automated handshake recovery...');
        scheduleReconnect();
      });

      ws.on('error', (err) => {
        app.debug(`WebSocket Pipeline Fault: ${err.message}`);
        ws.close();
      });
    }

    function scheduleReconnect() {
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 5000); // Wait 5 seconds before checking network route again
      }
    }

    // Initiate live driver socket loop
    connect();
  };

  plugin.stop = function () {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    app.setPluginStatus('Stopped');
    app.debug('H5000 socket loop gracefully torn down.');
  };

  return plugin;
};