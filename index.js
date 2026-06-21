const WebSocket = require('ws');

module.exports = function (app) {
  let plugin = {};
  let ws = null;
  let reconnectTimer = null;

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

  plugin.start = function (options, restartPlugin) {
    app.handleMessage(plugin.id, { info: 'Initializing Configurable B&G H5000 Feed' });

    // Build a runtime dictionary map out of the user's UI config array for O(1) high-frequency performance
    const activeMappings = {};
    if (options.sensorMappings && Array.isArray(options.sensorMappings)) {
      options.sensorMappings.forEach(mapping => {
        if (mapping.dataId) {
          activeMappings[mapping.dataId] = {
            path: mapping.path,
            type: mapping.conversionType
          };
        }
      });
    }

    function connect() {
      const url = `ws://${options.ipAddress}:${options.port}`;
      app.debug(`Connecting to H5000 CPU via UI configs at: ${url}`);

      ws = new WebSocket(url);

      ws.on('open', () => {
        app.setPluginStatus(`Active: Streaming ${Object.keys(activeMappings).length} mapped sensors from ${options.ipAddress}`);
      });

      ws.on('message', (data) => {
        try {
          const packet = JSON.parse(data);
          const dataId = packet.DataId;
          
          // Verify if the incoming Data ID exists in our UI-configured map
          if (dataId && activeMappings[dataId] && packet.Valid !== false) {
            const config = activeMappings[dataId];
            const skValue = convertValue(packet.Value, config.type);

            if (skValue !== null) {
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
                        path: config.path,
                        value: skValue
                      }
                    ]
                  }
                ]
              };
              app.handleMessage(plugin.id, delta);
            }
          }
        } catch (err) {
          app.debug(`Parsing mismatch: ${err.message}`);
        }
      });

      ws.on('close', () => {
        app.setPluginStatus('H5000 stream disconnected. Re-trying handshake loop...');
        scheduleReconnect();
      });

      ws.on('error', (err) => {
        app.debug(`Socket stream fault: ${err.message}`);
        ws.close();
      });
    }

    function scheduleReconnect() {
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 5000);
      }
    }

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
  };

  return plugin;
};