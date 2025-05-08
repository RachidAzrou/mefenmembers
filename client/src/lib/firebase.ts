import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Standaard waarden die worden gebruikt als fallback als environment variabelen niet beschikbaar zijn
const DEFAULT_DB_URL = "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app";
const DEFAULT_PROJECT_ID = "mefen-leden";

// Firebase configuratie met fallback opties voor betere foutafhandeling
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID}.firebaseapp.com`,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string || DEFAULT_DB_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string || DEFAULT_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID}.appspot.com`,
  messagingSenderId: "92917846687", // Deze waarde is niet kritisch
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: "G-RQDM8X2GZE" // Deze waarde is niet kritisch
};

// Log de Firebase configuratie tijdens ontwikkeling (met verborgen gevoelige gegevens)
if (import.meta.env.DEV) {
  console.log("Firebase configuratie geïnitialiseerd met:", {
    apiKey: firebaseConfig.apiKey ? "Geconfigureerd (verborgen)" : "Ontbreekt",
    projectId: firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL,
    appId: firebaseConfig.appId ? "Geconfigureerd (verborgen)" : "Ontbreekt",
  });
}

// Initialiseer Firebase en exporteer de benodigde services
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  
  // Log succesvolle initialisatie
  console.log("Firebase services succesvol geïnitialiseerd");
} catch (error) {
  console.error("Fout bij initialiseren Firebase:", error);
  
  // Dummy services om runtime fouten te voorkomen
  app = null;
  auth = null;
  db = null;
}

export { app, auth, db };
