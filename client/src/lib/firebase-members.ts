import { ref, get, child, set, query, orderByChild, onValue, off, Database } from "firebase/database";
import { db } from "@/lib/firebase";
import { Member } from "@shared/schema";

// Type cast db met een type cast als de import niet werkt
const database = db as Database | undefined;

/**
 * Haalt leden direct op vanuit Firebase als fallback wanneer de API niet werkt
 * Dit is belangrijk voor Vercel productie waarbij serverless functies soms niet beschikbaar zijn
 */
export async function fetchMembersFromFirebase(): Promise<Member[]> {
  try {
    console.log("Leden ophalen via Firebase fallback...");
    
    // Controleer of Firebase database beschikbaar is
    if (!database) {
      console.warn("Firebase database niet beschikbaar - toon dummy gegevens");
      return getMockMembersIfNeeded();
    }
    
    const membersRef = ref(database, 'members');
    
    try {
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
        return getMockMembersIfNeeded();
      }
    } catch (innerError) {
      console.error("Fout bij Firebase data fetch:", innerError);
      return getMockMembersIfNeeded();
    }
  } catch (error) {
    console.error("Fout bij ophalen leden uit Firebase:", error);
    return getMockMembersIfNeeded();
  }
}

/**
 * In het extreme geval dat zowel de API als Firebase niet beschikbaar zijn,
 * zorgen we ervoor dat de applicatie niet volledig leeg is
 */
function getMockMembersIfNeeded(): Member[] {
  console.warn("Firebase-fallback ook gefaald, gebruikend lokale nooddata als laatste redmiddel");
  
  // Controleer of we in productie omgeving zijn
  const isProduction = window.location.hostname.includes('vercel.app');
  
  if (isProduction) {
    const registrationDateTime = new Date();
    
    return [
      {
        id: 0,
        memberNumber: 9999,
        firstName: "VERBINDING",
        lastName: "PROBLEEM",
        phoneNumber: "Herlaad de pagina",
        email: "service@moskee-mefen.be",
        registrationDate: registrationDateTime,
        paymentStatus: false,
        notes: "Er is een verbindingsprobleem. Probeer de pagina te verversen of neem contact op met de beheerder.",
        birthDate: null,
        accountNumber: null
      }
    ];
  }
  
  // In ontwikkeling tonen we gewoon een lege lijst
  return [];
}

/**
 * Kijkt actief naar wijzigingen in de Firebase leden en update de UI
 */
export function subscribeMembersFromFirebase(callback: (members: Member[]) => void) {
  // Veiligheidscontrole
  if (!database) {
    console.warn("Firebase database niet beschikbaar voor real-time updates");
    callback([]);
    // Return een dummy opruimfunctie
    return () => {};
  }
  
  const membersRef = ref(database, 'members');
  
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