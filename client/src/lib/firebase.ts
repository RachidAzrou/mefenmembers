import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBcMISrNicWXlTHIfZv7V4ygIwWX_mSJmA",
  authDomain: "mefen-6da3c.firebaseapp.com",
  databaseURL: "https://mefen-6da3c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mefen-6da3c",
  storageBucket: "mefen-6da3c.firebasestorage.app",
  messagingSenderId: "92917846687",
  appId: "1:92917846687:web:55bb36fd0734f3833a48aa",
  measurementId: "G-RQDM8X2GZE"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
