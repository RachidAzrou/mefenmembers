import { WebSocketServer } from 'ws';
import { Server } from 'http';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Store room statuses
  const rooms = {
    'beneden': { id: 'beneden', title: 'Moskee +0', status: 'grey' },
    'first-floor': { id: 'first-floor', title: 'Moskee +1', status: 'grey' },
    'garage': { id: 'garage', title: 'Garage', status: 'grey' }
  };

  wss.on('connection', (ws) => {
    // Send initial status to new clients
    ws.send(JSON.stringify({ type: 'initialStatus', data: rooms }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'updateStatus') {
          const { room, status } = data;
          if (rooms[room]) {
            const newStatus = status === 'OK' ? 'green' : status === 'NOK' ? 'red' : 'grey';
            rooms[room].status = newStatus;

            // Broadcast the update to all clients
            wss.clients.forEach((client) => {
              if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify({
                  type: 'statusUpdated',
                  data: { room, status: newStatus }
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

  return wss;
}