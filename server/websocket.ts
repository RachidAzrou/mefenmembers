import { WebSocketServer } from 'ws';
import { Server } from 'http';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Store room statuses
  const rooms = {
    'first-floor': { id: 'first-floor', title: 'Moskee +1', status: 'grey' },
    'beneden': { id: 'beneden', title: 'Moskee +0', status: 'grey' },
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

  return wss;
}
