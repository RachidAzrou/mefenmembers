// Firebase Realtime Database configuratie
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push } from 'firebase/database';

// Direct hardcoded Firebase configuratie voor MEFEN project - geen env variables nodig
const firebaseConfig = {
  apiKey: "AIzaSyCw3uxCv7SdAa4xtmRimVjXlLjr_4hyeTE",
  authDomain: "mefen-leden.firebaseapp.com",
  databaseURL: "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mefen-leden",
  appId: "1:1032362907538:web:568add0016024ddf17534b"
};

// Initialiseer Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helper functie voor lidnummer generatie - vereenvoudigd voor Vercel serverless
async function getNextMemberNumber() {
  try {
    // Genereer nieuw nummer
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
  } catch (error) {
    // Fallback bij fouten
    return Math.floor(Date.now() / 1000) % 10000;
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
        const membersRef = ref(database, 'members');
        const snapshot = await get(membersRef);
        
        if (!snapshot.exists()) {
          return res.status(200).json([]);
        }
        
        // Zet de Firebase object data om naar een array voor client gebruik
        const members = [];
        const data = snapshot.val();
        
        for (const key in data) {
          members.push({
            id: key,
            ...data[key]
          });
        }
        
        // Sorteer op lidnummer
        members.sort((a, b) => a.memberNumber - b.memberNumber);
        
        return res.status(200).json(members);
      } catch (error) {
        return res.status(500).json({ error: 'Fout bij ophalen leden', details: error.message });
      }
    }
    
    // POST verzoek: voeg een nieuw lid toe
    if (req.method === 'POST') {
      // Haal data uit request body
      const { firstName, lastName, phoneNumber, email, birthDate, accountNumber, paymentStatus, notes } = req.body;
      
      // Controleer verplichte velden
      if (!firstName || !lastName || !phoneNumber) {
        return res.status(400).json({ 
          error: 'Ontbrekende verplichte velden',
          required: ['firstName', 'lastName', 'phoneNumber'] 
        });
      }
      
      // Genereer lidnummer
      const memberNumber = await getNextMemberNumber();
      
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
      
      // Voeg toe aan Firebase
      try {
        const membersRef = ref(database, 'members');
        const newMemberRef = push(membersRef);
        await set(newMemberRef, newMember);
        
        return res.status(201).json({
          id: newMemberRef.key,
          ...newMember
        });
      } catch (dbError) {
        return res.status(500).json({ error: 'Database fout', details: dbError.message });
      }
    }
    
    // Andere verzoeken worden niet ondersteund
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (error) {
    return res.status(500).json({ error: 'Server fout', details: error.message });
  }
}