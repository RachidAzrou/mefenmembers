const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Store room statuses
const rooms = {
  'first-floor': { id: 'first-floor', title: 'Moskee +1', status: 'grey' },
  'beneden': { id: 'beneden', title: 'Moskee +0', status: 'grey' },
  'garage': { id: 'garage', title: 'Garage', status: 'grey' }
};

// WebSocket connection handling
wss.on('connection', (ws) => {
  // Send initial status to new clients
  ws.send(JSON.stringify({ type: 'initialStatus', data: rooms }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'updateStatus') {
        const { room, status } = data;
        if (rooms[room]) {
          rooms[room].status = status === 'OK' ? 'green' : status === 'NOK' ? 'red' : 'grey';
          
          // Broadcast the update to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
              client.send(JSON.stringify({
                type: 'statusUpdated',
                data: { room, status: rooms[room].status }
              }));
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
