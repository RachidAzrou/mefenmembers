const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// WebSocket-server configuratie met CORS
const io = new Server(server, {
  cors: {
    origin: ["https://sufuf-app.vercel.app"], // Voeg je frontend-domeinen toe
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

app.use(express.static(path.join(__dirname, 'public')));

// Status data
let status = {
  'first-floor': 'OFF', // Standaardstatus
  'garage': 'OFF', // Standaardstatus
  'beneden': 'OFF', // nieuwe ruimte
  'vrouwen': 'OFF', // nieuwe ruimte
};

// WebSocket-communicatie
io.on('connection', (socket) => {
  console.log('Een gebruiker is verbonden');

  // Stuur de huidige status naar de imam bij verbinding
  socket.emit('initialStatus', status);

  // Luister naar statusupdates van vrijwilligers
  socket.on('updateStatus', (data) => {
    console.log('Statusupdate ontvangen:', data); // Log de ontvangen data
    if (data.status === 'OK') {
      status[data.room] = 'green';
    } else if (data.status === 'NOK') {
      status[data.room] = 'red';
    } else if (data.status === 'OFF') {
      status[data.room] = 'grey'; // OF als de status uitgeschakeld is
    }

    io.emit('statusUpdated', { room: data.room, status: status[data.room] }); // Stuur de update naar alle clients
  });

  socket.on('disconnect', () => {
    console.log('Een gebruiker is verbroken');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});
