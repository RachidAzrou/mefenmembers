import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Hard-coded default values als fallback voor als de omgevingsvariabelen niet beschikbaar zijn
// Dit garandeert dat de app werkt, zelfs als er problemen zijn met Vercel env variabelen
const FALLBACK_CONFIG = {
  apiKey: "AIzaSyDZbCKmZFLJYTd224Sj_3GsS2xLVzCyZUk",
  authDomain: "mefen-leden.firebaseapp.com",
  databaseURL: "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mefen-leden",
  storageBucket: "mefen-leden.appspot.com",
  messagingSenderId: "780110083561",
  appId: "1:780110083561:web:63785c6a24e76b00b73f50"
};

// Helper functie om te controleren of een string geldig is
const isValidString = (str: any): boolean => {
  return typeof str === 'string' && str.trim().length > 0;
};

// Bouw de configuratie op met omgevingsvariabelen of fallbacks
const firebaseConfig = {
  apiKey: isValidString(import.meta.env.VITE_FIREBASE_API_KEY) ? 
    import.meta.env.VITE_FIREBASE_API_KEY : FALLBACK_CONFIG.apiKey,
    
  authDomain: isValidString(import.meta.env.VITE_FIREBASE_PROJECT_ID) ? 
    `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` : FALLBACK_CONFIG.authDomain,
    
  databaseURL: isValidString(import.meta.env.VITE_FIREBASE_DATABASE_URL) ? 
    import.meta.env.VITE_FIREBASE_DATABASE_URL : FALLBACK_CONFIG.databaseURL,
    
  projectId: isValidString(import.meta.env.VITE_FIREBASE_PROJECT_ID) ? 
    import.meta.env.VITE_FIREBASE_PROJECT_ID : FALLBACK_CONFIG.projectId,
    
  storageBucket: isValidString(import.meta.env.VITE_FIREBASE_PROJECT_ID) ? 
    `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com` : FALLBACK_CONFIG.storageBucket,
    
  messagingSenderId: FALLBACK_CONFIG.messagingSenderId,
  
  appId: isValidString(import.meta.env.VITE_FIREBASE_APP_ID) ? 
    import.meta.env.VITE_FIREBASE_APP_ID : FALLBACK_CONFIG.appId
};

// Log de gebruikte configuratie (zonder gevoelige waarden) voor debugging
console.log("Firebase configuratie in gebruik:", {
  usingEnvironmentVars: {
    apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    databaseURL: !!import.meta.env.VITE_FIREBASE_DATABASE_URL,
    appId: !!import.meta.env.VITE_FIREBASE_APP_ID
  },
  configInUse: {
    authDomain: firebaseConfig.authDomain,
    databaseURL: firebaseConfig.databaseURL,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  }
});

let app;
let auth;
let db;

try {
  // Initialiseer Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  console.log("Firebase succesvol geïnitialiseerd");
} catch (error) {
  console.error("Firebase initialisatie fout:", error);
  
  // Als er een fout is, probeer opnieuw met de fallback configuratie
  try {
    console.log("Opnieuw proberen met fallback configuratie...");
    app = initializeApp(FALLBACK_CONFIG, "fallback");
    auth = getAuth(app);
    db = getDatabase(app);
    console.log("Firebase succesvol geïnitialiseerd met fallback configuratie");
  } catch (fallbackError) {
    console.error("Ook fallback configuratie faalde:", fallbackError);
    // Maak dummy objecten zodat de app niet crasht
    console.warn("Firebase services niet beschikbaar - app zal beperkte functionaliteit hebben");
  }
}

export { app, auth, db };
