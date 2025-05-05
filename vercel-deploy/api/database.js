// Firebase Realtime Database configuratie
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, update, remove, query, orderByChild } from 'firebase/database';

// Firebase configuratie
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialiseer Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Controleer de verbinding en log
console.log("Firebase Realtime Database geïnitialiseerd met URL:", firebaseConfig.databaseURL);

// Helper functie voor lidnummer generatie
export async function getNextMemberNumber() {
  try {
    // Controleer eerst of er verwijderde nummers zijn
    const deletedRef = ref(database, 'deletedMemberNumbers');
    const deletedSnap = await get(deletedRef);
    
    if (deletedSnap.exists() && Object.keys(deletedSnap.val()).length > 0) {
      // Haal de oudste verwijderde nummer (eerste in de lijst)
      const deletedData = deletedSnap.val();
      const oldestKey = Object.keys(deletedData)[0];
      const oldestNumber = deletedData[oldestKey].memberNumber;
      
      // Verwijder het nummer uit de deleted lijst
      await remove(ref(database, `deletedMemberNumbers/${oldestKey}`));
      
      console.log('Hergebruik verwijderd lidnummer:', oldestNumber);
      return oldestNumber;
    }
    
    // Anders, haal de hoogste lidnummer op en verhoog met 1
    const membersRef = ref(database, 'members');
    const membersSnap = await get(membersRef);
    
    if (!membersSnap.exists()) {
      console.log('Geen leden gevonden, start bij 1');
      return 1;
    }
    
    // Zoek het hoogste lidnummer
    const members = membersSnap.val();
    let maxNumber = 0;
    
    Object.values(members).forEach(member => {
      if (member.memberNumber && member.memberNumber > maxNumber) {
        maxNumber = member.memberNumber;
      }
    });
    
    const nextNumber = maxNumber + 1;
    console.log('Nieuw lidnummer gegenereerd:', nextNumber);
    return nextNumber;
  } catch (error) {
    console.error('Fout bij lidnummer generatie:', error);
    // Fallback bij fouten
    return Math.floor(Date.now() / 1000) % 10000; // Unix timestamp mod 10000 als fallback
  }
}

// Helper functie voor het formatteren van lidnummer
export function formatMemberNumber(number) {
  return number.toString().padStart(4, '0');
}

// Exporteer Firebase functies en database
export {
  database,
  ref,
  get,
  set,
  push,
  update,
  remove,
  query,
  orderByChild
};