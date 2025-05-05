import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Nieuwe Firebase configuratie voor MEFEN-leden
const firebaseConfig = {
  apiKey: "AIzaSyCw3uxCv7SdAa4xtmRimVjXlLjr_4hyeTE",
  authDomain: "mefen-leden.firebaseapp.com",
  projectId: "mefen-leden",
  storageBucket: "mefen-leden.firebasestorage.app",
  messagingSenderId: "1032362907538",
  appId: "1:1032362907538:web:568add0016024ddf17534b",
  measurementId: "G-SJQC5FGE6H",
  databaseURL: "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const analytics = getAnalytics(app);
