// Exercises the plugin end-to-end against the mock H5000 server, without a
// Signal K installation or the boat. Verifies:
//   1. the plugin subscribes via DataReq after connecting
//   2. Data batches are translated into Signal K deltas (sysVal preferred)
//   3. plugin.stop() actually stops it (no zombie reconnect after 5s)
const mock = require('./mock-h5000.js');

const PORT = 20530;
const deltas = [];
let statusLog = [];

const app = {
  debug: (msg) => console.log(`[plugin debug] ${msg}`),
  setPluginStatus: (msg) => {
    statusLog.push(msg);
    console.log(`[plugin status] ${msg}`);
  },
  handleMessage: (id, delta) => {
    deltas.push(delta);
    if (deltas.length <= 3) {
      console.log(`[delta] ${JSON.stringify(delta)}`);
    }
  }
};

const server = mock.start(PORT);
const plugin = require('../index.js')(app);

plugin.start({
  ipAddress: '127.0.0.1',
  port: PORT,
  sensorMappings: [
    { dataId: 15, path: 'steering.rudderAngle', conversionType: 'angle' },
    { dataId: 42, path: 'rigging.forestay.tension', conversionType: 'tension_lbs' }
  ]
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await sleep(3000);
  const received = deltas.length;
  console.log(`\nReceived ${received} deltas in 3s (expected ~30 at 10 Hz)`);

  const paths = new Set(
    deltas.flatMap((d) => d.updates.flatMap((u) => u.values.map((v) => v.path)))
  );
  console.log(`Paths seen: ${[...paths].join(', ')}`);

  console.log('\nStopping plugin, watching 7s for zombie reconnects...');
  plugin.stop();
  const countAtStop = deltas.length;
  const statusCountAtStop = statusLog.length;

  await sleep(7000);
  const reconnected =
    deltas.length !== countAtStop || statusLog.length !== statusCountAtStop;

  const pass =
    received > 20 &&
    paths.has('steering.rudderAngle') &&
    paths.has('rigging.forestay.tension') &&
    !reconnected;

  console.log(`\nData flow:        ${received > 20 ? 'PASS' : 'FAIL'}`);
  console.log(`Path mapping:     ${paths.size === 2 ? 'PASS' : 'FAIL'}`);
  console.log(`Clean stop:       ${!reconnected ? 'PASS' : 'FAIL (reconnected after stop!)'}`);
  console.log(`\n${pass ? 'ALL PASS' : 'FAILED'}`);

  server.close();
  process.exit(pass ? 0 : 1);
})();
