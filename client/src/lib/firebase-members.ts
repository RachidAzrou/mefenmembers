import { ref, get, child, set, query, orderByChild, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { Member } from "@shared/schema";

/**
 * Haalt leden direct op vanuit Firebase als fallback wanneer de API niet werkt
 * Dit is belangrijk voor Vercel productie waarbij serverless functies soms niet beschikbaar zijn
 */
export async function fetchMembersFromFirebase(): Promise<Member[]> {
  try {
    console.log("Leden ophalen via Firebase fallback...");
    const membersRef = ref(db, 'members');
    const snapshot = await get(membersRef);
    
    if (snapshot.exists()) {
      // Firebase slaat data op als object met IDs als keys, converteer naar array
      const membersObject = snapshot.val();
      const membersArray: Member[] = Object.keys(membersObject || {})
        .filter(key => membersObject[key] !== null) // Filter null/deleted entries
        .map(key => {
          const member = membersObject[key];
          // Remove Firebase-specific fields (like lastUpdated)
          const { lastUpdated, ...cleanMember } = member;
          return cleanMember as Member;
        });
      
      console.log(`${membersArray.length} leden gevonden via Firebase fallback`);
      return membersArray;
    } else {
      console.log("Geen leden gevonden in Firebase");
      return [];
    }
  } catch (error) {
    console.error("Fout bij ophalen leden uit Firebase:", error);
    throw new Error("Fout bij het ophalen van leden uit Firebase database");
  }
}

/**
 * Kijkt actief naar wijzigingen in de Firebase leden en update de UI
 */
export function subscribeMembersFromFirebase(callback: (members: Member[]) => void) {
  const membersRef = ref(db, 'members');
  
  const handleDataChange = (snapshot: any) => {
    if (snapshot.exists()) {
      const membersObject = snapshot.val();
      const membersArray: Member[] = Object.keys(membersObject || {})
        .filter(key => membersObject[key] !== null)
        .map(key => {
          const member = membersObject[key];
          const { lastUpdated, ...cleanMember } = member;
          return cleanMember as Member;
        });
      
      callback(membersArray);
    } else {
      callback([]);
    }
  };
  
  // Start luisteren naar data wijzigingen
  onValue(membersRef, handleDataChange);
  
  // Functie om weer op te ruimen
  return () => {
    off(membersRef, 'value', handleDataChange);
  };
}