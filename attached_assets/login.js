document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const password = document.getElementById('password').value;

  // Hardcoded password en versienummer
  const correctPassword = 'sufuf2020'; // Nieuw wachtwoord
  const passwordVersion = '4'; // Versienummer (verhoog dit bij wachtwoordwijziging)

  if (password === correctPassword) {
    // Store login state and password version in sessionStorage
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('passwordVersion', passwordVersion); // Sla het versienummer op
    // Redirect to the volunteer page (vrijwilliger.html)
    window.location.href = '/vrijwilliger.html';
  } else {
    // Show error message
    document.getElementById('error-message').style.display = 'block';
  }
});