const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 3000;
const STATIC_DIR = path.join(__dirname, 'public');

let messages = [];
let groupInfo = { name: "Bongo SMS Group", image: "/default-group.png" };

// Load saved data if exists
const messagesFile = path.join(__dirname, 'messages.json');
const groupFile = path.join(__dirname, 'group.json');

if (fs.existsSync(messagesFile)) {
  messages = JSON.parse(fs.readFileSync(messagesFile));
}

if (fs.existsSync(groupFile)) {
  groupInfo = JSON.parse(fs.readFileSync(groupFile));
}

// Save helper
function saveMessages() {
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
}

function saveGroup() {
  fs.writeFileSync(groupFile, JSON.stringify(groupInfo, null, 2));
}

// HTTP server serving static files and API endpoints
const server = http.createServer((req, res) => {
  // API: Get messages
  if (req.method === 'GET' && req.url === '/messages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(messages));
    return;
  }

  // API: Get group info
  if (req.method === 'GET' && req.url === '/group.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(groupInfo));
    return;
  }

  // API: Post new message (text or image)
  if (req.method === 'POST' && req.url === '/messages') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        if (msg.username && (msg.message || msg.image)) {
          msg.timestamp = Date.now();
          messages.push(msg);
          saveMessages();

          // Broadcast to all WS clients
          broadcast(JSON.stringify({ type: 'message', data: msg }));

          res.writeHead(200);
          res.end('ok');
        } else {
          res.writeHead(400);
          res.end('Invalid message');
        }
      } catch {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // API: Update group info
  if (req.method === 'POST' && req.url === '/group') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const update = JSON.parse(body);
        if (!update.username) {
          res.writeHead(400);
          res.end('Username required');
          return;
        }

        let changedFields = [];

        if (update.name && update.name !== groupInfo.name) {
          groupInfo.name = update.name;
          changedFields.push('name');
        }
        if (update.image && update.image !== groupInfo.image) {
          groupInfo.image = update.image;
          changedFields.push('image');
        }

        if (changedFields.length) {
          saveGroup();

          // Broadcast update and notification message
          const updateMsg = {
            username: 'System',
            message: `${update.username} updated group ${changedFields.join(' and ')}`,
            timestamp: Date.now(),
            system: true,
          };

          messages.push(updateMsg);
          saveMessages();

          const payload = {
            type: 'groupUpdate',
            data: {
              groupInfo,
              notification: updateMsg,
            }
          };

          broadcast(JSON.stringify(payload));
        }

        res.writeHead(200);
        res.end('ok');

      } catch {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // Serve static files from /public
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

// WebSocket server
const wss = new WebSocket.Server({ server });

function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', ws => {
  // Send current group info and last messages on connect
  ws.send(JSON.stringify({ type: 'groupUpdate', data: { groupInfo } }));
  ws.send(JSON.stringify({ type: 'messagesBatch', data: messages.slice(-50) }));

  ws.on('message', message => {
    // Optionally handle incoming WS messages here
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
