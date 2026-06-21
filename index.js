const WebSocket = require('ws');

module.exports = function (app) {
  let plugin = {};
  let ws = null;
  let reconnectTimer = null;

  plugin.id = 'signalk-h5000-websocket';
  plugin.name = 'B&G H5000 WebSocket Ingest';
  plugin.description = 'Ingests telemetry directly from the B&G H5000 CPU webserver.';

  // Define plugin configuration options visible in the Signal K Admin UI
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

  // Map H5000 Data IDs to official Signal K paths
  // Note: Signal K uses SI units internally (e.g., m/s for speed, radians for angles)
  const H5000_TO_SIGNALK = {
    1: { path: 'navigation.speedThroughWater', type: 'speed' },      // Knots to m/s
    2: { path: 'environment.wind.speedApparent', type: 'speed' },     // Knots to m/s
    3: { path: 'environment.wind.angleApparent', type: 'angle' },     // Deg to Rad
    4: { path: 'environment.wind.speedTrue', type: 'speed' },         // Knots to m/s
    5: { path: 'environment.wind.angleTrueGround', type: 'angle' },   // Deg to Rad
    12: { path: 'navigation.headingTrue', type: 'angle' },            // Deg to Rad
    24: { path: 'navigation.attitude.roll', type: 'angle' },          // Heel (Heel is roll in SK)
  };

  // Helper functions to convert B&G units to standard Signal K SI units
  function convertValue(val, type) {
    if (type === 'speed') return val * 0.514444; // Knots to m/s
    if (type === 'angle') return val * (Math.PI / 180); // Degrees to Radians
    return val;
  }

  plugin.start = function (options, restartPlugin) {
    app.handleMessage(plugin.id, { info: 'Starting H5000 WebSocket Plugin' });

    function connect() {
      const url = `ws://${options.ipAddress}:${options.port}`;
      app.debug(`Connecting to H5000 at ${url}`);

      ws = new WebSocket(url);

      ws.on('open', () => {
        app.setPluginStatus(`Connected to H5000 at ${options.ipAddress}`);
      });

      ws.on('message', (data) => {
        try {
          const packet = JSON.parse(data);
          const dataId = packet.DataId;
          
          if (H5000_TO_SIGNALK[dataId]) {
            const mapping = H5000_TO_SIGNALK[dataId];
            const skValue = convertValue(packet.Value, mapping.type);

            // Construct a standard Signal K Delta message
            const delta = {
              updates: [
                {
                  source: {
                    label: 'h5000-websocket',
                    type: 'WebSocket'
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

            // Push the update directly into Signal K's data core
            app.handleMessage(plugin.id, delta);
          }
        } catch (err) {
          app.debug('Error parsing H5000 packet: ' + err.message);
        }
      });

      ws.on('close', () => {
        app.setPluginStatus('Disconnected. Retrying connection...');
        scheduleReconnect();
      });

      ws.on('error', (err) => {
        app.debug('WebSocket Error: ' + err.message);
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
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    app.setPluginStatus('Stopped');
  };

  return plugin;
};