/*
 * signalk-h5000-websocket
 *
 * Bridges a B&G H5000 CPU's GoFree Data Service WebSocket (ws://<ip>:2053)
 * into Signal K, and ships a built-in live discovery/mapping web UI so the
 * mapping table can be edited from the boat while comparing against the
 * mast plotters, without editing raw JSON config by hand.
 *
 * Two independent WebSocket connections are used:
 *   1. `mappedSocket` — subscribes ONLY to the IDs listed in sensorMappings
 *      and is what actually feeds app.handleMessage() -> Signal K deltas.
 *      This is the "production" path and matches the original plugin's
 *      behaviour/traffic footprint.
 *   2. `scanSocket` — opened on demand (from the live UI's "Start scan"
 *      button) to subscribe to a wide ID range (default 0-599) purely for
 *      discovery. It never touches Signal K; results are cached in memory
 *      and served to the UI via a small HTTP API registered with the
 *      Signal K server's router. It is closed automatically after the
 *      requested scan window (default 5 minutes) or when explicitly
 *      stopped, so it never runs forever in the background.
 */

const WebSocket = require('ws');
const path = require('path');
const express = require('express');

// Known Data ID -> human label, built from the H5000's own eDataType enum
// (extracted from the unit's vendor JavaScript) plus IDs confirmed live
// against real sailing conditions on 2026-08-16. Anything not in this map
// still shows up in the live view as "ID <n>" with its raw value — the
// point of the live view is that you don't need the label to be useful,
// you can eyeball the live number against the plotter and map it yourself.
const KNOWN_LABELS = {
  17: 'SpeedThroughWater (legacy ID, often silent)',
  37: 'Heading',
  41: 'SpeedOverGround',
  42: 'SpeedThroughWater',
  46: 'AWS (Apparent Wind Speed)',
  47: 'TWS (True Wind Speed)',
  77: 'Depth Below Transducer',
  123: 'Attitude Pitch',
  124: 'Attitude Roll',
  140: 'AWA (Apparent Wind Angle)',
  141: 'TWA Water (True Wind Angle, water ref)',
  142: 'TWD (True Wind Direction)',
  146: 'Rudder Angle',
  150: 'Rudder Angle (alt)',
  165: 'Depth (alt)',
  228: 'Target True Wind Angle',
  234: 'Target Boat Speed',
  238: 'Depth (alt 2)',
  240: 'Polar Speed',
  384: 'TWS Correction (calibration factor, not an angle)',
  309: 'Latitude (candidate)',
  310: 'Longitude (candidate)',
  421: 'Latitude (candidate)',
  422: 'Longitude (candidate)',
  497: 'Boat Speed (candidate)'
};

const CONVERSIONS = {
  none: (v) => v,
  speed: (v) => v * 0.514444, // knots -> m/s
  angle: (v) => v * (Math.PI / 180), // degrees -> radians
  temperature: (v) => (v - 32) * (5 / 9) + 273.15 // F -> Kelvin
};

module.exports = function (app) {
  const plugin = {};
  plugin.id = 'signalk-h5000-websocket';
  plugin.name = 'B&G H5000 WebSocket Bridge';
  plugin.description = 'Ingests B&G H5000 GoFree Data Service telemetry over WebSocket, with a live mapping UI';

  let mappedSocket = null;
  let scanSocket = null;
  let scanTimer = null;
  let reconnectTimer = null;
  let currentConfig = {};
  const scanCache = new Map(); // id -> { val, sysVal, valStr, valid, lastSeen }
  let scanActive = false;
  let scanEndsAt = null;

  function log(...args) {
    app.debug('[h5000]', ...args);
  }

  function convertValue(val, type) {
    const fn = CONVERSIONS[type] || CONVERSIONS.none;
    return fn(val);
  }

  function connectMappedSocket(config) {
    if (mappedSocket) {
      try { mappedSocket.terminate(); } catch (e) { /* ignore */ }
      mappedSocket = null;
    }

    const ids = (config.sensorMappings || []).map((m) => m.dataId);
    if (ids.length === 0) {
      app.setPluginStatus('No sensor mappings configured — nothing to subscribe to');
      return;
    }

    const url = `ws://${config.ipAddress}:${config.port}`;
    log('connecting mapped socket to', url, 'for IDs', ids);
    const socket = new WebSocket(url);
    mappedSocket = socket;

    socket.on('open', () => {
      log('mapped socket open');
      app.setPluginStatus(`Connected to H5000 at ${config.ipAddress}:${config.port}`);
      const req = { DataReq: ids.map((id) => ({ id, repeat: true, inst: 0 })) };
      socket.send(JSON.stringify(req));
    });

    socket.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (e) {
        return;
      }
      if (!msg.Data) return;

      const mappings = (currentConfig.sensorMappings || []);
      for (const item of msg.Data) {
        const mapping = mappings.find((m) => m.dataId === item.id);
        if (!mapping) continue;
        if (typeof item.val !== 'number') continue;

        // NOTE (2026-08-16): sysVal was assumed to always be SI, but live
        // testing showed this is unreliable: depth channels (77/165/238)
        // report sysVal in feet not meters, wind/boat-speed channels
        // (41/42/46/47/497) report sysVal as an unconverted duplicate of
        // val (still knots), and even some angle-like channels (e.g. 384)
        // report sysVal as an unconverted duplicate of val (still degrees)
        // instead of radians. Using val plus the user-configured
        // conversionType was correct in every case we tested, so we stop
        // trusting sysVal entirely.
        const skValue = convertValue(item.val, mapping.conversionType);

        app.handleMessage(plugin.id, {
          updates: [
            {
              source: { label: plugin.id },
              timestamp: new Date().toISOString(),
              values: [{ path: mapping.path, value: skValue }]
            }
          ]
        });
      }
    });

    socket.on('close', () => {
      log('mapped socket closed, will reconnect in 5s');
      if (mappedSocket === socket) mappedSocket = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => connectMappedSocket(currentConfig), 5000);
    });

    socket.on('error', (err) => {
      log('mapped socket error', err.message);
      app.setPluginStatus(`H5000 connection error: ${err.message}`);
    });
  }

  function stopScan() {
    if (scanSocket) {
      try { scanSocket.terminate(); } catch (e) { /* ignore */ }
      scanSocket = null;
    }
    clearTimeout(scanTimer);
    scanTimer = null;
    scanActive = false;
    scanEndsAt = null;
  }

  function startScan(config, { minId = 0, maxId = 599, durationMs = 5 * 60 * 1000 } = {}) {
    stopScan();
    scanCache.clear();

    const url = `ws://${config.ipAddress}:${config.port}`;
    log('starting discovery scan', url, `IDs ${minId}-${maxId}`, `${durationMs}ms`);
    const socket = new WebSocket(url);
    scanSocket = socket;
    scanActive = true;
    scanEndsAt = Date.now() + durationMs;

    socket.on('open', () => {
      const ids = [];
      for (let id = minId; id <= maxId; id++) ids.push(id);
      const req = { DataReq: ids.map((id) => ({ id, repeat: true, inst: 0 })) };
      socket.send(JSON.stringify(req));
    });

    socket.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (e) {
        return;
      }
      if (!msg.Data) return;
      for (const item of msg.Data) {
        scanCache.set(item.id, {
          val: item.val,
          sysVal: item.sysVal,
          valStr: item.valStr,
          valid: item.valid,
          lastSeen: Date.now()
        });
      }
    });

    socket.on('error', (err) => {
      log('scan socket error', err.message);
    });

    socket.on('close', () => {
      if (scanSocket === socket) scanSocket = null;
    });

    scanTimer = setTimeout(() => {
      log('scan window elapsed, stopping');
      stopScan();
    }, durationMs);
  }

  plugin.start = function (config) {
    currentConfig = config || {};
    if (!currentConfig.sensorMappings) currentConfig.sensorMappings = [];
    connectMappedSocket(currentConfig);
  };

  plugin.stop = function () {
    clearTimeout(reconnectTimer);
    if (mappedSocket) {
      try { mappedSocket.terminate(); } catch (e) { /* ignore */ }
      mappedSocket = null;
    }
    stopScan();
  };

  // Minimal schema kept for the standard Signal K config screen (IP/port
  // and a fallback view of the raw mapping array). The live UI at
  // /plugins/signalk-h5000-websocket/ is the primary way to edit mappings.
  plugin.schema = {
    type: 'object',
    required: ['ipAddress', 'port'],
    properties: {
      ipAddress: { type: 'string', title: 'H5000 IP address', default: '192.168.1.104' },
      port: { type: 'number', title: 'H5000 WebSocket port', default: 2053 },
      sensorMappings: {
        type: 'array',
        title: 'Sensor mappings (use the Live Mapping UI to edit these easily)',
        items: {
          type: 'object',
          required: ['dataId', 'path', 'conversionType'],
          properties: {
            dataId: { type: 'number', title: 'H5000 Data ID' },
            path: { type: 'string', title: 'Signal K path' },
            conversionType: {
              type: 'string',
              title: 'Conversion',
              enum: ['none', 'speed', 'angle', 'temperature'],
              default: 'none'
            }
          }
        }
      }
    }
  };

  // ---- Live UI HTTP API -------------------------------------------------
  plugin.registerWithRouter = function (router) {
    // Serve the live mapping UI (public/index.html and friends) at this
    // plugin's own router root, e.g. /plugins/signalk-h5000-websocket/
    router.use(express.static(path.join(__dirname, 'public')));

    router.get('/api/labels', (req, res) => {
      res.json(KNOWN_LABELS);
    });

    router.get('/api/config', (req, res) => {
      res.json({
        ipAddress: currentConfig.ipAddress,
        port: currentConfig.port,
        sensorMappings: currentConfig.sensorMappings || []
      });
    });

    router.post('/api/config', (req, res) => {
      const body = req.body || {};
      if (!Array.isArray(body.sensorMappings)) {
        res.status(400).json({ error: 'sensorMappings must be an array' });
        return;
      }
      currentConfig.sensorMappings = body.sensorMappings;
      app.savePluginOptions(currentConfig, () => {
        log('config saved from live UI, reconnecting mapped socket');
        connectMappedSocket(currentConfig);
        res.json({ ok: true });
      });
    });

    router.post('/api/scan/start', (req, res) => {
      const body = req.body || {};
      const minId = Number.isFinite(body.minId) ? body.minId : 0;
      const maxId = Number.isFinite(body.maxId) ? body.maxId : 599;
      const durationMs = Number.isFinite(body.durationMs) ? body.durationMs : 5 * 60 * 1000;
      if (!currentConfig.ipAddress || !currentConfig.port) {
        res.status(400).json({ error: 'Set and save the H5000 IP address/port first' });
        return;
      }
      startScan(currentConfig, { minId, maxId, durationMs });
      res.json({ ok: true, endsAt: scanEndsAt });
    });

    router.post('/api/scan/stop', (req, res) => {
      stopScan();
      res.json({ ok: true });
    });

    router.get('/api/scan/data', (req, res) => {
      const rows = [];
      for (const [id, data] of scanCache.entries()) {
        rows.push({
          id,
          label: KNOWN_LABELS[id] || null,
          val: data.val,
          sysVal: data.sysVal,
          valStr: data.valStr,
          valid: data.valid,
          ageMs: Date.now() - data.lastSeen
        });
      }
      rows.sort((a, b) => a.id - b.id);
      res.json({
        scanning: scanActive,
        endsAt: scanEndsAt,
        count: rows.length,
        rows
      });
    });
  };

  return plugin;
};
