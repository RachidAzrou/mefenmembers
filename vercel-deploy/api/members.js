// Implementatie die alleen gebruik maakt van directe HTTP aanroepen naar Firebase REST API
// Dit is volledig compatibel met het gratis Firebase plan
import axios from 'axios';

// Firebase project gegevens voor Realtime Database REST API toegang 
// Deze waarden worden uit environment variabelen gelezen als ze beschikbaar zijn
const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app";
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCw3uxCv7SdAa4xtmRimVjXlLjr_4hyeTE";

// Helper functie om direct met de Firebase REST API te communiceren
async function firebaseRequest(method, path, data = null) {
  try {
    // Valideer dat Firebase Database URL en API key beschikbaar zijn
    if (!FIREBASE_DB_URL) {
      console.error("FIREBASE_DATABASE_URL niet geconfigureerd of leeg!");
      throw new Error("Firebase Database URL ontbreekt - controleer environment variables");
    }
    
    if (!FIREBASE_API_KEY) {
      console.error("FIREBASE_API_KEY niet geconfigureerd of leeg!");
      throw new Error("Firebase API Key ontbreekt - controleer environment variables");
    }
    
    const url = `${FIREBASE_DB_URL}/${path}.json?auth=${FIREBASE_API_KEY}`;
    console.log(`Firebase REST API ${method} request naar: ${FIREBASE_DB_URL}/${path}.json`);
    
    const config = {
      method,
      url,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 seconden timeout om hangende requests te voorkomen
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = JSON.stringify(data);
    }
    
    try {
      const response = await axios(config);
      console.log(`Firebase REST API ${method} succesvol, status:`, response.status);
      return response.data;
    } catch (axiosError) {
      // Verbeterde foutafhandeling voor Axios errors
      if (axiosError.response) {
        // Server antwoordde met een status buiten het 2xx bereik
        console.error(`Firebase REST API server fout (${method} ${path}):`, {
          status: axiosError.response.status,
          data: axiosError.response.data
        });
        throw new Error(`Firebase API fout: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        // Request gemaakt maar geen antwoord ontvangen
        console.error(`Firebase REST API timeout/geen antwoord (${method} ${path}):`, axiosError.message);
        throw new Error(`Firebase API timeout: Controleer je internet verbinding en Firebase project status`);
      } else {
        // Iets ging mis bij het maken van de request
        console.error(`Firebase REST API request configuratie fout (${method} ${path}):`, axiosError.message);
        throw new Error(`Firebase API request fout: ${axiosError.message}`);
      }
    }
  } catch (error) {
    console.error(`Firebase REST API algemene fout (${method} ${path}):`, error.message, error.stack);
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
  // Log omgeving info voor debug doeleinden
  console.log("Vercel Serverless Function Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? "Aanwezig" : "Ontbreekt",
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL ? "Aanwezig" : "Ontbreekt",
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY ? "Aanwezig" : "Ontbreekt"
  });
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
      
      // Controleer of we een specifiek lid moeten ophalen
      if (req.query.id) {
        try {
          const id = req.query.id;
          console.log(`GET /api/members/${id}: Ophalen specifiek lid gestart`);
          
          const data = await firebaseRequest('GET', `members/${id}`);
          
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
        const { 
          firstName, lastName, phoneNumber, email, birthDate, accountNumber, paymentStatus, notes,
          gender, nationality, street, houseNumber, busNumber, postalCode, city,
          membershipType, startDate, endDate, autoRenew, paymentTerm, paymentMethod,
          bicSwift, accountHolderName, privacyConsent
        } = req.body;
        
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
        
        // Maak nieuwe lid data - SLA ALLE VELDEN OP
        const newMember = {
          memberNumber,
          // Persoonsgegevens
          firstName,
          lastName,
          gender: gender || null,
          birthDate: birthDate || null,
          nationality: nationality || null,
          
          // Contactgegevens
          phoneNumber,
          email: email || '',
          street: street || null,
          houseNumber: houseNumber || null,
          busNumber: busNumber || null, 
          postalCode: postalCode || null,
          city: city || null,
          
          // Lidmaatschap
          membershipType: membershipType || 'standaard',
          startDate: startDate || new Date().toISOString(),
          endDate: endDate || null,
          autoRenew: autoRenew !== undefined ? autoRenew : true,
          paymentTerm: paymentTerm || 'jaarlijks',
          paymentMethod: paymentMethod || 'cash',
          
          // Bankgegevens
          accountNumber: accountNumber || '',
          bicSwift: bicSwift || null,
          accountHolderName: accountHolderName || null,
          
          // Overig
          paymentStatus: paymentStatus || false,
          registrationDate: new Date().toISOString(),
          privacyConsent: privacyConsent || false,
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
        const { 
          firstName, lastName, phoneNumber, email, birthDate, accountNumber, paymentStatus, notes,
          gender, nationality, street, houseNumber, busNumber, postalCode, city,
          membershipType, startDate, endDate, autoRenew, paymentTerm, paymentMethod,
          bicSwift, accountHolderName, privacyConsent
        } = req.body;
        
        // Haal eerst het bestaande lid op om de huidige data te behouden
        const existingMember = await firebaseRequest('GET', `members/${id}`);
        
        // Bouw update object met ALLE velden
        const updateData = {
          // Persoonsgegevens
          firstName,
          lastName,
          gender: gender ?? existingMember?.gender ?? null,
          birthDate: birthDate ?? existingMember?.birthDate ?? null,
          nationality: nationality ?? existingMember?.nationality ?? null,
          
          // Contactgegevens
          phoneNumber,
          email: email || existingMember?.email || '',
          street: street ?? existingMember?.street ?? null,
          houseNumber: houseNumber ?? existingMember?.houseNumber ?? null,
          busNumber: busNumber ?? existingMember?.busNumber ?? null, 
          postalCode: postalCode ?? existingMember?.postalCode ?? null,
          city: city ?? existingMember?.city ?? null,
          
          // Lidmaatschap
          membershipType: membershipType ?? existingMember?.membershipType ?? 'standaard',
          startDate: startDate ?? existingMember?.startDate ?? null,
          endDate: endDate ?? existingMember?.endDate ?? null,
          autoRenew: autoRenew !== undefined ? autoRenew : existingMember?.autoRenew !== undefined ? existingMember.autoRenew : true,
          paymentTerm: paymentTerm ?? existingMember?.paymentTerm ?? 'jaarlijks',
          paymentMethod: paymentMethod ?? existingMember?.paymentMethod ?? 'cash',
          
          // Bankgegevens
          accountNumber: accountNumber ?? existingMember?.accountNumber ?? '',
          bicSwift: bicSwift ?? existingMember?.bicSwift ?? null,
          accountHolderName: accountHolderName ?? existingMember?.accountHolderName ?? null,
          
          // Overig
          paymentStatus: paymentStatus !== undefined ? paymentStatus : existingMember?.paymentStatus !== undefined ? existingMember.paymentStatus : false,
          registrationDate: existingMember?.registrationDate || new Date().toISOString(),
          privacyConsent: privacyConsent !== undefined ? privacyConsent : existingMember?.privacyConsent !== undefined ? existingMember.privacyConsent : false,
          notes: notes ?? existingMember?.notes ?? ''
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
    
    // Voor het lokaal testen van Firebase variabelen
    if (req.method === 'GET' && req.url.includes('/api/members/test-firebase')) {
      try {
        console.log("GET /api/members/test-firebase: Firebase connectie testen");
        
        return res.status(200).json({
          status: "success",
          message: "Firebase test endpoint beschikbaar",
          config: {
            firebase_db_url_set: !!process.env.FIREBASE_DATABASE_URL,
            firebase_api_key_set: !!process.env.FIREBASE_API_KEY,
            firebase_db_url_default: FIREBASE_DB_URL.includes("mefen-leden"),
            firebase_api_key_valid: FIREBASE_API_KEY && FIREBASE_API_KEY.length > 20
          }
        });
      } catch (error) {
        console.error("GET /api/members/test-firebase FOUT:", error.message);
        return res.status(500).json({ 
          error: 'Fout bij testen Firebase connectie', 
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