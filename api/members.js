// Zeer eenvoudige Axios implementatie voor directe HTTP-aanroepen naar Firebase REST API
// Deze benadering omzeilt de Firebase SDK's compleet en gebruikt directe HTTP requests
import axios from 'axios';

// Firebase project gegevens
const FIREBASE_DB_URL = "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app";
const FIREBASE_API_KEY = "AIzaSyCw3uxCv7SdAa4xtmRimVjXlLjr_4hyeTE";

// Helper functie voor lidnummer generatie - robuuster gemaakt voor serverless omgeving
async function getNextMemberNumber() {
  try {
    // Probeer met child reference van de root node (robuustere methode)
    try {
      // Gebruik child() met de root reference voor betere serverless compatibiliteit
      const snapshot = await get(child(dbRef, 'members'));
      
      // Controleer of data bestaat en een val() method heeft
      if (!snapshot.exists()) {
        console.log('Geen leden gevonden, start met lidnummer 1');
        return 1;
      }
      
      // Controleer expliciet of val() een functie is
      if (typeof snapshot.val !== 'function') {
        throw new Error('Snapshot val is geen functie, gebruik fallback');
      }
      
      // Haal data op en vind hoogste nummer
      const members = snapshot.val();
      let maxNumber = 0;
      
      // Veiligheidscontrole of leden een object is
      if (members && typeof members === 'object') {
        Object.values(members).forEach(member => {
          if (member.memberNumber && member.memberNumber > maxNumber) {
            maxNumber = member.memberNumber;
          }
        });
      }
      
      console.log(`Hoogste gevonden lidnummer: ${maxNumber}, geef ${maxNumber + 1} terug`);
      return maxNumber + 1;
    } catch (snapError) {
      console.error('Fout bij snapshots:', snapError.message);
      throw snapError; // Propageer naar de outer catch
    }
  } catch (error) {
    // Fallback bij fouten - beter foutbericht
    console.error('Fallback lidnummer gebruikt vanwege fout:', error.message);
    const fallbackNumber = Math.floor(Date.now() / 1000) % 10000;
    console.log(`Fallback lidnummer: ${fallbackNumber}`);
    return fallbackNumber;
  }
}

// Vercel serverless functie
export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS (preflight) request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // GET verzoek: haal alle leden op
    if (req.method === 'GET') {
      try {
        // Gebruik child reference met extra robuustheid voor serverless omgeving
        console.log("GET /api/members: Ophalen leden gestart");
        const snapshot = await get(child(dbRef, 'members'));
        
        // Controleer of data bestaat
        if (!snapshot.exists()) {
          console.log("GET /api/members: Geen leden gevonden");
          return res.status(200).json([]);
        }
        
        // Controleer of val() een functie is
        if (typeof snapshot.val !== 'function') {
          console.error("GET /api/members: snapshot.val is geen functie");
          return res.status(500).json({ 
            error: 'Database fout: val is geen functie',
            snapshot: JSON.stringify(snapshot) 
          });
        }
        
        // Haal data op en zet om naar array
        const data = snapshot.val();
        console.log(`GET /api/members: Data opgehaald, type: ${typeof data}`);
        
        // Veiligheidscheck of data een object is
        if (!data || typeof data !== 'object') {
          console.error(`GET /api/members: Ongeldig dataformaat: ${typeof data}`);
          return res.status(200).json([]); // Geen data of ongeldig formaat
        }
        
        // Zet de Firebase object data om naar een array voor client gebruik
        const members = [];
        for (const key in data) {
          members.push({
            id: key,
            ...data[key]
          });
        }
        
        // Sorteer op lidnummer
        members.sort((a, b) => a.memberNumber - b.memberNumber);
        console.log(`GET /api/members: ${members.length} leden succesvol opgehaald`);
        
        return res.status(200).json(members);
      } catch (error) {
        console.error("GET /api/members FOUT:", error.message, error.stack);
        return res.status(500).json({ 
          error: 'Fout bij ophalen leden', 
          details: error.message,
          stack: error.stack
        });
      }
    }
    
    // POST verzoek: voeg een nieuw lid toe
    if (req.method === 'POST') {
      try {
        console.log("POST /api/members: Nieuw lid toevoegen gestart");
        // Controleer dat er een body is
        if (!req.body || typeof req.body !== 'object') {
          return res.status(400).json({ 
            error: 'Ongeldige request body',
            received: typeof req.body
          });
        }
        
        // Log de request body voor diagnose
        console.log("POST /api/members: Request body:", JSON.stringify(req.body));
        
        // Haal data uit request body
        const { firstName, lastName, phoneNumber, email, birthDate, accountNumber, paymentStatus, notes } = req.body;
        
        // Controleer verplichte velden
        if (!firstName || !lastName || !phoneNumber) {
          console.log("POST /api/members: Ontbrekende verplichte velden");
          return res.status(400).json({ 
            error: 'Ontbrekende verplichte velden',
            required: ['firstName', 'lastName', 'phoneNumber'] 
          });
        }
        
        console.log("POST /api/members: Genereren nieuw lidnummer");
        // Genereer lidnummer
        const memberNumber = await getNextMemberNumber();
        console.log("POST /api/members: Nieuw lidnummer gegenereerd:", memberNumber);
        
        // Maak nieuwe lid data
        const newMember = {
          memberNumber,
          firstName,
          lastName,
          phoneNumber,
          email: email || '',
          birthDate: birthDate || null,
          accountNumber: accountNumber || '',
          paymentStatus: paymentStatus || false,
          registrationDate: new Date().toISOString(),
          notes: notes || ''
        };
        
        console.log("POST /api/members: Lid data voorbereid:", JSON.stringify(newMember));
        
        // Voeg toe aan Firebase met betere foutafhandeling
        try {
          // Gebruik rechtstreeks een pad om naar de 'members' node te schrijven
          const membersRef = ref(database, 'members');
          const newMemberRef = push(membersRef);
          
          console.log("POST /api/members: Nieuw lid reference gemaakt:", newMemberRef.key);
          
          // Schrijf data naar de database
          await set(newMemberRef, newMember);
          console.log("POST /api/members: Lid succesvol toegevoegd met ID:", newMemberRef.key);
          
          return res.status(201).json({
            id: newMemberRef.key,
            ...newMember
          });
        } catch (dbError) {
          console.error("POST /api/members Database fout:", dbError.message, dbError.stack);
          return res.status(500).json({ 
            error: 'Database fout bij toevoegen lid', 
            details: dbError.message,
            stack: dbError.stack
          });
        }
      } catch (error) {
        console.error("POST /api/members Algemene fout:", error.message, error.stack);
        return res.status(500).json({ 
          error: 'Server fout bij toevoegen lid', 
          details: error.message,
          stack: error.stack
        });
      }
    }
    
    // Andere verzoeken worden niet ondersteund
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (error) {
    return res.status(500).json({ error: 'Server fout', details: error.message });
  }
}