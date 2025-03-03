// Verbind met de externe Socket.IO-server
const socket = io('https://sufuf-socketio-server.onrender.com'); // Vervang dit door de URL van je Render-server

const okSwitch = document.getElementById('ok-switch');
const nokSwitch = document.getElementById('nok-switch');

// Laad de opgeslagen status bij het openen van de pagina
socket.on('initialStatus', (data) => {
  if (data['beneden'] === 'green') {
    okSwitch.checked = true;
  } else if (data['beneden'] === 'red') {
    nokSwitch.checked = true;
  }
});

okSwitch.addEventListener('change', (e) => {
  if (e.target.checked) {
    nokSwitch.checked = false;
    socket.emit('updateStatus', { room: 'beneden', status: 'OK' }); // Verzend 'OK', server verwacht 'green'
  } else if (!okSwitch.checked && !nokSwitch.checked) {
    socket.emit('updateStatus', { room: 'beneden', status: 'OFF' });
  }
});

nokSwitch.addEventListener('change', (e) => {
  if (e.target.checked) {
    okSwitch.checked = false;
    socket.emit('updateStatus', { room: 'beneden', status: 'NOK' }); // Verzend 'NOK', server verwacht 'red'
  } else if (!okSwitch.checked && !nokSwitch.checked) {
    socket.emit('updateStatus', { room: 'beneden', status: 'OFF' });
  }
});
