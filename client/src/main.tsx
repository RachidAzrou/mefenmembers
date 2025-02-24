import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Wacht tot de pagina volledig is geladen
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Forceer netwerk requests voor updates
      });
      console.log('Service Worker geregistreerd:', registration);

      // Check voor updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nieuwe versie is geïnstalleerd en klaar voor gebruik
              console.log('Nieuwe versie beschikbaar - ververs de pagina om te updaten');
              // Hier kunnen we een notificatie tonen aan de gebruiker
            }
          });
        }
      });

      // Periodiek checken voor updates
      setInterval(() => {
        registration.update();
      }, 1000 * 60 * 60); // Check elk uur

    } catch (error) {
      console.error('Service Worker registratie mislukt:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);