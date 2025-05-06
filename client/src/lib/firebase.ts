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

// Functie om de huidige Firebase-gebruiker op te halen
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Functie om het auth token op te halen voor API-verzoeken
export async function getAuthToken(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Fout bij ophalen auth token:", error);
    return null;
  }
}
