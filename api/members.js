// Implementatie die gebruik maakt van Firebase Admin SDK voor beveiligde toegang
// Hiermee kunnen we beveiligingsregels gebruiken in de database
import { firebaseAdminRequest } from './firebase-admin';

// Helper functie om met de Firebase Admin SDK te communiceren
// Deze vervangt de oude firebaseRequest functie
async function firebaseRequest(method, path, data = null, authToken = null) {
  try {
    console.log(`Firebase Admin SDK ${method} request naar pad: ${path}`);
    return await firebaseAdminRequest(method, path, data, authToken);
  } catch (error) {
    console.error(`Firebase Admin SDK fout (${method} ${path}):`, error.message);
    throw new Error(`Firebase API fout: ${error.message}`);
  }
}

// Helper functie voor lidnummer generatie - met REST API
async function getNextMemberNumber(userToken = null) {
  try {
    console.log('Volgende lidnummer ophalen via REST API');
    
    // Haal leden op via REST API met auth token
    const members = await firebaseRequest('GET', 'members', null, userToken);
    
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
      const deletedMemberNumbers = await firebaseRequest('GET', 'deletedMemberNumbers', null, userToken);
      
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
            await firebaseRequest('DELETE', `deletedMemberNumbers/${keyToDelete}`, null, userToken);
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    
    // Debug-endpoint om Firebase Admin SDK-configuratie te testen
    if (req.url.includes('/test-admin-sdk') || req.query.action === 'test-admin-sdk') {
      console.log("TEST: Firebase Admin SDK configuratie testen");
      try {
        const { firebaseAdmin } = require('./firebase-admin');
        const projectId = firebaseAdmin.app().options.projectId;
        const credential = firebaseAdmin.app().options.credential;
        
        // Probeer een test-lezen uit te voeren
        const testRead = await firebaseRequest('GET', 'test-admin-sdk-ping');
        
        return res.status(200).json({
          success: true,
          message: "Firebase Admin SDK is correct geconfigureerd",
          projectId,
          hasCredential: !!credential,
          testRead
        });
      } catch (error) {
        console.error("TEST: Firebase Admin SDK configuratie fout:", error.message);
        return res.status(500).json({
          success: false,
          message: "Firebase Admin SDK configuratiefout",
          error: error.message
        });
      }
    }
    
    // Handle OPTIONS (preflight) request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Extract user token for all operations
    let userToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
    }
    
    // GET verzoek: specifieke endpoints of alle leden
    if (req.method === 'GET') {
      // Controleer op verschillende manieren of het het generate-number endpoint is
      // Dit maakt ons compatibel met verschillende URL-formaten die Vercel zou kunnen gebruiken
      if (req.url.includes('/generate-number') || req.url === '/api/members/generate-number' || req.query.action === 'generate-number') {
        try {
          console.log("GET /api/members/generate-number: Volgend lidnummer genereren");
          const nextNumber = await getNextMemberNumber(userToken);
          console.log(`GET /api/members/generate-number: Volgend lidnummer is ${nextNumber}`);
          // Formatteren naar hetzelfde formaat dat server/routes.ts gebruikt
          const memberNumber = nextNumber.toString().padStart(4, '0');
          return res.status(200).json({ memberNumber });
        } catch (error) {
          console.error("GET /api/members/generate-number FOUT:", error.message);
          return res.status(500).json({ 
            error: 'Fout bij genereren lidnummer', 
            details: error.message 
          });
        }
      }
      
      // Controleer of we een specifiek lid moeten ophalen
      if (req.query.id) {
        try {
          const id = req.query.id;
          console.log(`GET /api/members/${id}: Ophalen specifiek lid gestart`);
          
          const data = await firebaseRequest('GET', `members/${id}`, null, userToken);
          
          if (!data) {
            console.log(`GET /api/members/${id}: Lid niet gevonden`);
            return res.status(404).json({ error: 'Lid niet gevonden' });
          }
          
          console.log(`GET /api/members/${id}: Lid succesvol opgehaald`);
          return res.status(200).json({
            id: id,
            ...data
          });
        } catch (error) {
          console.error(`GET /api/members/${req.query.id} FOUT:`, error.message);
          return res.status(500).json({ 
            error: 'Fout bij ophalen specifiek lid', 
            details: error.message 
          });
        }
      }
      
      // Anders haal alle leden op
      try {
        console.log("GET /api/members: Ophalen leden gestart via REST API");
        
        // Gebruik de REST API om leden op te halen
        const data = await firebaseRequest('GET', 'members', null, userToken);
        
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
        
        // Controleer verplichte velden
        if (!req.body.firstName || !req.body.lastName || !req.body.phoneNumber) {
          console.log("POST /api/members: Ontbrekende verplichte velden");
          return res.status(400).json({ 
            error: 'Ontbrekende verplichte velden',
            required: ['firstName', 'lastName', 'phoneNumber'] 
          });
        }
        
        console.log("POST /api/members: Genereren nieuw lidnummer");
        // Genereer lidnummer
        const memberNumber = await getNextMemberNumber(userToken);
        console.log("POST /api/members: Nieuw lidnummer gegenereerd:", memberNumber);
        
        // Maak nieuwe lid data - neem alle velden over van de request body
        const newMember = {
          memberNumber,
          ...req.body,
          registrationDate: new Date().toISOString()
        };
        
        // Zorg ervoor dat deze velden altijd een waarde hebben, zelfs als null
        if (newMember.email === undefined) newMember.email = '';
        if (newMember.gender === undefined) newMember.gender = '';
        if (newMember.membershipType === undefined) newMember.membershipType = 'standaard';
        if (newMember.paymentStatus === undefined) newMember.paymentStatus = false;
        
        console.log("POST /api/members: Lid data voorbereid:", JSON.stringify(newMember));
        
        // Voeg toe aan Firebase met REST API
        try {
          console.log("POST /api/members: Lid toevoegen via REST API");
          
          // Gebruik de REST API POST methode om een nieuw lid toe te voegen
          // Firebase POST genereert automatisch een unieke ID als key
          const result = await firebaseRequest('POST', 'members', newMember, userToken);
          
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
        
        // Log de request body voor diagnose
        console.log(`PUT /api/members/${id}: Request body:`, JSON.stringify(req.body));
        
        // Haal eerst het bestaande lid op
        const existingMember = await firebaseRequest('GET', `members/${id}`, null, userToken);
        if (!existingMember) {
          return res.status(404).json({ error: 'Lid niet gevonden' });
        }
        
        // Bewaar het lidnummer van het bestaande lid
        const { memberNumber } = existingMember;
        
        // Bouw update object - behoud alle velden uit de request
        const updateData = {
          ...existingMember,  // Behoud bestaande data als fallback
          ...req.body,        // Update met nieuwe data
          memberNumber        // Behoud altijd het originele lidnummer
        };
        
        // Zorg ervoor dat deze velden altijd een waarde hebben
        if (updateData.email === undefined) updateData.email = '';
        if (updateData.gender === undefined) updateData.gender = existingMember.gender || '';
        if (updateData.membershipType === undefined) updateData.membershipType = existingMember.membershipType || 'standaard';
        if (updateData.paymentStatus === undefined) updateData.paymentStatus = false;
        
        console.log(`PUT /api/members/${id}: Update data:`, JSON.stringify(updateData));
        
        // Update via REST API
        await firebaseRequest('PUT', `members/${id}`, updateData, userToken);
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
        const memberData = await firebaseRequest('GET', `members/${id}`, null, userToken);
        if (!memberData || !memberData.memberNumber) {
          console.log(`DELETE /api/members/${id}: Lid niet gevonden of geen geldig nummer`);
        } else {
          // Voeg het lidnummer toe aan de verwijderde nummers
          await firebaseRequest('POST', 'deletedMemberNumbers', {
            memberNumber: memberData.memberNumber,
            deletedAt: new Date().toISOString()
          }, userToken);
          console.log(`DELETE /api/members/${id}: Lidnummer ${memberData.memberNumber} toegevoegd aan verwijderde nummers`);
        }
        
        // Verwijder het lid
        await firebaseRequest('DELETE', `members/${id}`, null, userToken);
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