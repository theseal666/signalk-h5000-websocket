const WebSocket = require('ws');

module.exports = function (app) {
  let plugin = {};
  let ws = null;
  let reconnectTimer = null;
  let stopped = false;

  plugin.id = 'signalk-h5000-websocket';
  plugin.name = 'B&G H5000 WebSocket Ingest';
  plugin.description = 'Ingests high-frequency telemetry directly from the B&G H5000 CPU webserver with custom user-defined sensor maps.';

  // This schema generates the custom inputs and tables inside the Signal K Admin UI
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
      },
      sensorMappings: {
        type: 'array',
        title: 'Custom Sensor Mappings',
        description: 'Map raw B&G Data IDs to standard Signal K paths.',
        items: {
          type: 'object',
          required: ['dataId', 'path', 'conversionType'],
          properties: {
            dataId: {
              type: 'number',
              title: 'H5000 Data ID (e.g., 15 for rudder, 42 for forestay)'
            },
            path: {
              type: 'string',
              title: 'Signal K Path (e.g., steering.rudderAngle)',
              default: 'navigation.speedThroughWater'
            },
            conversionType: {
              type: 'string',
              title: 'Unit Conversion Type',
              description: 'Only applied when the H5000 omits sysVal (already SI) and the plugin falls back to the display value.',
              default: 'none',
              enum: ['none', 'speed', 'angle', 'tension_lbs'],
              enumNames: [
                'No Conversion (Pass-through raw)',
                'Knots to Meters/Second (Speed)',
                'Degrees to Radians (Angles/Rotation)',
                'Pounds-Force to Newtons (Rigging Tension)'
              ]
            }
          }
        }
      }
    }
  };

  // Helper function to convert raw Navico numbers to standard Signal K SI units
  function convertValue(val, type) {
    if (typeof val !== 'number' || isNaN(val)) return null;

    switch (type) {
      case 'speed':
        return val * 0.514444;       // Knots to m/s
      case 'angle':
        return val * (Math.PI / 180);  // Degrees to Radians
      case 'tension_lbs':
        return val * 4.44822;        // Lbs-force to Newtons
      default:
        return val;                  // Raw value
    }
  }

  plugin.start = function (options) {
    stopped = false;

    if (!options || !options.ipAddress) {
      app.setPluginStatus('Not configured: set the H5000 CPU IP address in the plugin config');
      return;
    }

    // Build a runtime dictionary map out of the user's UI config array for O(1) high-frequency performance
    const activeMappings = {};
    (options.sensorMappings || []).forEach(mapping => {
      if (mapping.dataId != null) {
        activeMappings[mapping.dataId] = {
          path: mapping.path,
          type: mapping.conversionType
        };
      }
    });

    function connect() {
      const url = `ws://${options.ipAddress}:${options.port || 2053}`;
      app.debug(`Connecting to H5000 CPU at ${url}`);

      ws = new WebSocket(url);

      ws.on('open', () => {
        // The GoFree Data Service only sends data that has been subscribed to,
        // so request a repeating feed of every configured Data ID.
        const request = {
          DataReq: Object.keys(activeMappings).map(id => ({
            id: Number(id),
            repeat: true,
            inst: 0
          }))
        };
        ws.send(JSON.stringify(request));
        app.setPluginStatus(`Connected to ${options.ipAddress}, subscribed to ${request.DataReq.length} data IDs`);
      });

      ws.on('message', (data) => {
        try {
          const packet = JSON.parse(data);
          if (!Array.isArray(packet.Data)) return;

          const values = [];
          packet.Data.forEach(item => {
            const config = activeMappings[item.id];
            if (!config || item.valid === false) return;

            // sysVal is already in SI units; the display value needs the configured conversion
            const skValue = typeof item.sysVal === 'number'
              ? item.sysVal
              : convertValue(item.val, config.type);

            if (skValue !== null) {
              values.push({ path: config.path, value: skValue });
            }
          });

          if (values.length > 0) {
            app.handleMessage(plugin.id, {
              updates: [
                {
                  source: { label: 'h5000-websocket' },
                  values: values
                }
              ]
            });
          }
        } catch (err) {
          app.debug(`Failed to parse message: ${err.message}`);
        }
      });

      ws.on('close', () => {
        if (!stopped) {
          app.setPluginStatus('H5000 stream disconnected, reconnecting...');
          scheduleReconnect();
        }
      });

      ws.on('error', (err) => {
        app.debug(`WebSocket error: ${err.message}`);
        ws.terminate();
      });
    }

    function scheduleReconnect() {
      if (!reconnectTimer && !stopped) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 5000);
      }
    }

    connect();
  };

  plugin.stop = function () {
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.terminate();
      ws = null;
    }
    app.setPluginStatus('Stopped');
  };

  return plugin;
};
