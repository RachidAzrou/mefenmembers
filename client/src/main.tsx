import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker geregistreerd:', registration);
      })
      .catch(error => {
        console.error('Service Worker registratie mislukt:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);