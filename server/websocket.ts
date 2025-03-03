import { WebSocketServer, WebSocket } from 'ws';
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
    console.log('Client connected');

    // Send initial status to new clients
    ws.send(JSON.stringify({ type: 'initialStatus', data: rooms }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);

        if (data.type === 'updateStatus') {
          const { room, status } = data;
          if (rooms[room]) {
            const newStatus = status === 'OK' ? 'green' : status === 'NOK' ? 'red' : 'grey';
            rooms[room].status = newStatus;
            console.log(`Updated room ${room} status to ${newStatus}`);

            // Broadcast the update to all clients
            const broadcastMessage = JSON.stringify({
              type: 'statusUpdated',
              data: { room, status: newStatus }
            });

            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastMessage);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  return wss;
}