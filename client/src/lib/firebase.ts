import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string || "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "92917846687", // Deze waarde is niet kritisch
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: "G-RQDM8X2GZE" // Deze waarde is niet kritisch
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Globale variabele om te voorkomen dat we telkens opnieuw onAuthStateChanged moeten aanroepen
let authInitialized = false;
let cachedUser: User | null = null;

// Functie om te wachten tot Firebase auth geïnitialiseerd is
export async function waitForAuthInit(): Promise<void> {
  if (authInitialized) return;
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      authInitialized = true;
      unsubscribe();
      resolve();
    });
  });
}

// Functie om de huidige Firebase-gebruiker op te halen
export async function getCurrentUser(): Promise<User | null> {
  // Zorg ervoor dat we wachten tot auth geïnitialiseerd is
  await waitForAuthInit();
  
  // Als we al een gebruiker in de cache hebben, gebruik die
  if (cachedUser) return cachedUser;
  
  return new Promise((resolve) => {
    // We gebruiken onAuthStateChanged om een stabiele authenticatiestatus te krijgen
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      cachedUser = user; // Sla de gebruiker op in de cache
      unsubscribe();
      resolve(user);
    });
  });
}

// Functie om het auth token op te halen voor API-verzoeken
export async function getAuthToken(): Promise<string | null> {
  // Wacht eerst tot auth is geïnitialiseerd en haal dan de gebruiker op
  const user = await getCurrentUser();
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Fout bij ophalen auth token:", error);
    return null;
  }
}

// Functie om cache te wissen als de authenticatiestatus verandert
export function setupAuthListener() {
  onAuthStateChanged(auth, (user) => {
    console.log("Authenticatiestatus veranderd:", user ? "ingelogd" : "uitgelogd");
    cachedUser = user;
    authInitialized = true;
  });
}
