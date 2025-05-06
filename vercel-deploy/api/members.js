// Implementatie die alleen gebruik maakt van directe HTTP aanroepen naar Firebase REST API
// Dit is volledig compatibel met het gratis Firebase plan
import axios from 'axios';

// Firebase project gegevens voor Realtime Database REST API toegang 
const FIREBASE_DB_URL = "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app";
const FIREBASE_API_KEY = "AIzaSyCw3uxCv7SdAa4xtmRimVjXlLjr_4hyeTE";

// Helper functie om direct met de Firebase REST API te communiceren
async function firebaseRequest(method, path, data = null) {
  try {
    const url = `${FIREBASE_DB_URL}/${path}.json?auth=${FIREBASE_API_KEY}`;
    console.log(`Firebase REST API ${method} request naar: ${url}`);
    
    const config = {
      method,
      url,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = JSON.stringify(data);
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Firebase REST API fout (${method} ${path}):`, error.message);
    throw new Error(`Firebase API fout: ${error.message}`);
  }
}

// Helper functie voor lidnummer generatie - met REST API
async function getNextMemberNumber() {
  try {
    console.log('Volgende lidnummer ophalen via REST API');
    
    // Haal leden op via REST API
    const members = await firebaseRequest('GET', 'members');
    
    // Als er geen leden zijn of geen geldig object, begin met 1
    if (!members || typeof members !== 'object') {
      console.log('Geen leden gevonden, start met lidnummer 1');
      return 1;
    }
    
    // Vind het hoogste lidnummer
    let maxNumber = 0;
    Object.values(members).forEach(member => {
      if (member?.memberNumber && typeof member.memberNumber === 'number' && member.memberNumber > maxNumber) {
        maxNumber = member.memberNumber;
      }
    });
    
    // Controleer ook de verwijderde lidnummers voor hergebruik
    try {
      // Haal verwijderde nummers op
      const deletedMemberNumbers = await firebaseRequest('GET', 'deletedMemberNumbers');
      
      // Als er verwijderde nummers zijn, gebruik het laagste beschikbare nummer
      if (deletedMemberNumbers && typeof deletedMemberNumbers === 'object' && Object.keys(deletedMemberNumbers).length > 0) {
        const availableNumbers = Object.values(deletedMemberNumbers)
          .filter(item => item?.memberNumber)
          .map(item => item.memberNumber)
          .sort((a, b) => a - b);
        
        if (availableNumbers.length > 0) {
          // Gebruik het laagste beschikbare nummer
          const lowestAvailable = availableNumbers[0];
          
          // Verwijder dit nummer uit de lijst van verwijderde nummers
          const keyToDelete = Object.keys(deletedMemberNumbers).find(
            key => deletedMemberNumbers[key]?.memberNumber === lowestAvailable
          );
          
          if (keyToDelete) {
            await firebaseRequest('DELETE', `deletedMemberNumbers/${keyToDelete}`);
          }
          
          console.log(`Hergebruik verwijderd lidnummer: ${lowestAvailable}`);
          return lowestAvailable;
        }
      }
    } catch (deletedError) {
      console.error('Fout bij ophalen verwijderde lidnummers:', deletedError.message);
      // Bij een fout gaan we gewoon door en gebruiken het volgende nummer
    }
    
    console.log(`Hoogste gevonden lidnummer: ${maxNumber}, geef ${maxNumber + 1} terug`);
    return maxNumber + 1;
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
    
    // GET verzoek: specifieke endpoints of alle leden
    if (req.method === 'GET') {
      // Als het een specifiek endpoint is
      if (req.url.includes('/api/members/generate-number')) {
        try {
          console.log("GET /api/members/generate-number: Volgend lidnummer genereren");
          const nextNumber = await getNextMemberNumber();
          console.log(`GET /api/members/generate-number: Volgend lidnummer is ${nextNumber}`);
          return res.status(200).json({ number: nextNumber });
        } catch (error) {
          console.error("GET /api/members/generate-number FOUT:", error.message);
          return res.status(500).json({ 
            error: 'Fout bij genereren lidnummer', 
            details: error.message 
          });
        }
      }
      
      // Anders haal alle leden op
      try {
        console.log("GET /api/members: Ophalen leden gestart via REST API");
        
        // Gebruik de REST API om leden op te halen
        const data = await firebaseRequest('GET', 'members');
        
        // Veiligheidscheck voor geen data
        if (!data) {
          console.log("GET /api/members: Geen leden gevonden");
          return res.status(200).json([]);
        }
        
        console.log(`GET /api/members: Data opgehaald, type: ${typeof data}`);
        
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
          details: error.message
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
        
        // Voeg toe aan Firebase met REST API
        try {
          console.log("POST /api/members: Lid toevoegen via REST API");
          
          // Gebruik de REST API POST methode om een nieuw lid toe te voegen
          // Firebase POST genereert automatisch een unieke ID als key
          const result = await firebaseRequest('POST', 'members', newMember);
          
          if (!result || !result.name) {
            throw new Error('Geen geldige ID ontvangen van Firebase');
          }
          
          const newMemberId = result.name;
          console.log("POST /api/members: Lid succesvol toegevoegd met ID:", newMemberId);
          
          return res.status(201).json({
            id: newMemberId,
            ...newMember
          });
        } catch (dbError) {
          console.error("POST /api/members Database fout:", dbError.message);
          return res.status(500).json({ 
            error: 'Database fout bij toevoegen lid', 
            details: dbError.message
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
    
    // PUT verzoek: update een lid
    if (req.method === 'PUT') {
      try {
        // Haal ID uit de URL
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Geen lid ID opgegeven' });
        }
        
        console.log(`PUT /api/members/${id}: Lid updaten gestart`);
        
        // Controleer body
        if (!req.body || typeof req.body !== 'object') {
          return res.status(400).json({ error: 'Ongeldige request body' });
        }
        
        // Haal data uit request body
        const { firstName, lastName, phoneNumber, email, birthDate, 
                accountNumber, paymentStatus, notes } = req.body;
        
        // Bouw update object
        const updateData = {
          firstName,
          lastName,
          phoneNumber,
          email: email || '',
          birthDate: birthDate || null,
          accountNumber: accountNumber || '',
          paymentStatus: paymentStatus || false,
          notes: notes || ''
        };
        
        // Update via REST API
        await firebaseRequest('PUT', `members/${id}`, updateData);
        console.log(`PUT /api/members/${id}: Lid succesvol bijgewerkt`);
        
        return res.status(200).json({
          id,
          ...updateData
        });
      } catch (error) {
        console.error("PUT /api/members FOUT:", error.message);
        return res.status(500).json({ 
          error: 'Fout bij bijwerken lid', 
          details: error.message 
        });
      }
    }
    
    // DELETE verzoek: verwijder een lid
    if (req.method === 'DELETE') {
      try {
        // Haal ID uit de URL
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'Geen lid ID opgegeven' });
        }
        
        console.log(`DELETE /api/members/${id}: Lid verwijderen gestart`);
        
        // Haal eerst het lidnummer op om naar verwijderde nummers te verplaatsen
        const memberData = await firebaseRequest('GET', `members/${id}`);
        if (!memberData || !memberData.memberNumber) {
          console.log(`DELETE /api/members/${id}: Lid niet gevonden of geen geldig nummer`);
        } else {
          // Voeg het lidnummer toe aan de verwijderde nummers
          await firebaseRequest('POST', 'deletedMemberNumbers', {
            memberNumber: memberData.memberNumber,
            deletedAt: new Date().toISOString()
          });
          console.log(`DELETE /api/members/${id}: Lidnummer ${memberData.memberNumber} toegevoegd aan verwijderde nummers`);
        }
        
        // Verwijder het lid
        await firebaseRequest('DELETE', `members/${id}`);
        console.log(`DELETE /api/members/${id}: Lid succesvol verwijderd`);
        
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("DELETE /api/members FOUT:", error.message);
        return res.status(500).json({ 
          error: 'Fout bij verwijderen lid', 
          details: error.message 
        });
      }
    }
    
    // Andere verzoeken worden niet ondersteund
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (error) {
    return res.status(500).json({ error: 'Server fout', details: error.message });
  }
}