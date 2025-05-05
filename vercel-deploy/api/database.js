// Firebase Realtime Database configuratie
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, update, remove, query, orderByChild } from 'firebase/database';

// Direct hardcoded Firebase configuratie voor MEFEN project
// BELANGRIJK: Deze configuratie wordt direct gebruikt, geen env variables nodig
const firebaseConfig = {
  apiKey: "AIzaSyCw3uxCv7SdAa4xtmRimVjXlLjr_4hyeTE",
  authDomain: "mefen-leden.firebaseapp.com",
  databaseURL: "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mefen-leden",
  appId: "1:1032362907538:web:568add0016024ddf17534b"
};

// Log beperkte Firebase debug info
console.log("Firebase database URL:", firebaseConfig.databaseURL);

// Initialiseer Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Controleer de verbinding en log
console.log("Firebase Realtime Database geïnitialiseerd met URL:", firebaseConfig.databaseURL);
console.log("Firebase Config:", { 
  projectId: firebaseConfig.projectId,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId
});

// Helper functie voor lidnummer generatie - vereenvoudigd voor Vercel serverless
export async function getNextMemberNumber() {
  try {
    // Probeer verwijderde nummer te hergebruiken
    try {
      const deletedRef = ref(database, 'deletedMemberNumbers');
      const deletedSnap = await get(deletedRef);
      
      if (deletedSnap.exists() && Object.keys(deletedSnap.val()).length > 0) {
        const deletedData = deletedSnap.val();
        const oldestKey = Object.keys(deletedData)[0];
        const oldestNumber = deletedData[oldestKey].memberNumber;
        
        // Verwijder uit deleted lijst
        await remove(ref(database, `deletedMemberNumbers/${oldestKey}`));
        return oldestNumber;
      }
    } catch (deletedError) {
      console.error('Fout bij controleren verwijderde nummers, ga verder naar genereren nieuw nummer');
    }
    
    // Genereer nieuw nummer
    try {
      const membersRef = ref(database, 'members');
      const membersSnap = await get(membersRef);
      
      if (!membersSnap.exists()) {
        return 1;
      }
      
      // Zoek hoogste nummer
      const members = membersSnap.val();
      let maxNumber = 0;
      
      Object.values(members).forEach(member => {
        if (member.memberNumber && member.memberNumber > maxNumber) {
          maxNumber = member.memberNumber;
        }
      });
      
      return maxNumber + 1;
    } catch (membersError) {
      console.error('Fout bij ophalen leden, gebruik fallback nummer');
      throw membersError;
    }
  } catch (error) {
    // Fallback bij fouten
    const fallbackNumber = Math.floor(Date.now() / 1000) % 10000;
    return fallbackNumber;
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