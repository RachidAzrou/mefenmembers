const socket = io('https://sufuf-socketio-server.onrender.com'); // Pas aan indien nodig

// Luister naar de initiële status
socket.on('initialStatus', (data) => {
  updateLight('first-floor-light', data['first-floor']);
  updateLight('garage-light', data['garage']);
  updateLight('beneden-light', data['beneden']);
  //updateLight('vrouwen-light', data['vrouwen']);
});

// Luister naar statusupdates
socket.on('statusUpdated', (data) => {
  console.log("Status update ontvangen:", data);
  updateLight(`${data.room}-light`, data.status);
});

// Functie om het licht en de iconen bij te werken
function updateLight(elementId, status) {
  const light = document.getElementById(elementId);
  if (!light) {
    console.warn(`Element niet gevonden: ${elementId}`);
    return;
  }

  const checkIcon = light.querySelector(".fa-check");
  const crossIcon = light.querySelector(".fa-times");

  if (!checkIcon || !crossIcon) {
    console.warn(`Icons niet gevonden in: ${elementId}`);
    return;
  }

  // Verwijder alle kleurklassen
  light.classList.remove('green', 'red', 'grey');

  // Voeg de juiste kleurklasse toe en toon het juiste icoon
  if (status === 'green') {
    light.classList.add('green');
    checkIcon.style.display = 'block';
    crossIcon.style.display = 'none';
  } else if (status === 'red') {
    light.classList.add('red');
    checkIcon.style.display = 'none';
    crossIcon.style.display = 'block';
  } else {
    light.classList.add('grey');
    checkIcon.style.display = 'none';
    crossIcon.style.display = 'none';
  }

  console.log(`Licht bijgewerkt: ${elementId} → ${status}`);
}
