// Mock B&G H5000 GoFree Data Service.
// Speaks the same subscription protocol as the real CPU: clients send
// {"DataReq":[{id, repeat, inst}]} and receive repeating {"Data":[...]} batches.
// Run standalone (node test/mock-h5000.js) to test against a real Signal K
// server, or require it from a test harness.
const { WebSocketServer } = require('ws');

function start(port) {
  const wss = new WebSocketServer({ port });
  console.log(`Mock H5000 GoFree Data Service on ws://127.0.0.1:${port}`);

  wss.on('connection', (socket) => {
    console.log('[mock] client connected');
    const subscriptions = new Set();
    let timer = null;

    socket.on('message', (raw) => {
      console.log(`[mock] received: ${raw}`);
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!Array.isArray(msg.DataReq)) return;

      msg.DataReq.forEach((req) => {
        if (req.repeat) subscriptions.add(req.id);
      });

      // Stream subscribed IDs at 10 Hz, like the real unit
      if (!timer && subscriptions.size > 0) {
        timer = setInterval(() => {
          const Data = [...subscriptions].map((id) => {
            const val = +(Math.random() * 20).toFixed(2);
            return {
              id,
              val,
              sysVal: +(val * 0.514444).toFixed(4),
              valid: true,
              inst: 0
            };
          });
          socket.send(JSON.stringify({ Data }));
        }, 100);
      }
    });

    socket.on('close', () => {
      clearInterval(timer);
      console.log('[mock] client disconnected');
    });
  });

  return wss;
}

module.exports = { start };

if (require.main === module) {
  start(Number(process.env.PORT) || 2053);
}
