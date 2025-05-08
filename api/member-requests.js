// Implementatie die alleen gebruik maakt van directe HTTP aanroepen naar Firebase REST API
// Voor het verwerken van lidmaatschapsaanvragen (member-requests)
import axios from 'axios';

// Firebase project gegevens voor Realtime Database REST API toegang 
// Deze waarden worden uit environment variabelen gelezen als ze beschikbaar zijn
const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app";
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyCw3uxCv7SdAa4xtmRimVjXlLjr_4hyeTE";

// Uitgebreide logging voor Firebase configuratie troubleshooting
console.log("API Initialization: Firebase DB URL:", FIREBASE_DB_URL ? "Ingesteld (waarde verborgen)" : "ONTBREEKT!");  
console.log("API Initialization: Firebase API Key:", FIREBASE_API_KEY ? "Ingesteld (waarde verborgen)" : "ONTBREEKT!");

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

// Vercel serverless functie voor lidmaatschapsaanvragen
export default async function handler(req, res) {
  // Log omgeving info voor debug doeleinden met expliciete waarden (alleen eerste tekens voor veiligheid)
  const firebase_db_url = process.env.FIREBASE_DATABASE_URL || "Fallback URL gebruikt";
  const firebase_api_key = process.env.FIREBASE_API_KEY || "Fallback API key gebruikt";
  
  console.log("Vercel Serverless Function Environment - Member Requests:", {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? "Aanwezig" : "Ontbreekt",
    FIREBASE_DATABASE_URL: firebase_db_url.substring(0, 20) + "..." || "Ontbreekt",
    FIREBASE_API_KEY: firebase_api_key.substring(0, 5) + "..." || "Ontbreekt",
    FALLBACK_URL_USED: !process.env.FIREBASE_DATABASE_URL,
    FALLBACK_API_KEY_USED: !process.env.FIREBASE_API_KEY
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
    
    // GET verzoek: lijst van aanvragen ophalen
    if (req.method === 'GET') {
      try {
        console.log("GET /api/member-requests: Ophalen van lidmaatschapsaanvragen gestart");
        
        // Gebruik de REST API om lidmaatschapsaanvragen op te halen
        const data = await firebaseRequest('GET', 'member-requests');
        
        // Veiligheidscheck voor geen data
        if (!data) {
          console.log("GET /api/member-requests: Geen lidmaatschapsaanvragen gevonden");
          return res.status(200).json([]);
        }
        
        console.log(`GET /api/member-requests: Data opgehaald, type: ${typeof data}`);
        
        // Zet de Firebase object data om naar een array voor client gebruik
        const memberRequests = [];
        for (const key in data) {
          memberRequests.push({
            id: key,
            ...data[key]
          });
        }
        
        // Sorteer op aanvraagdatum (nieuwste eerst)
        memberRequests.sort((a, b) => new Date(b.requestDate || 0) - new Date(a.requestDate || 0));
        console.log(`GET /api/member-requests: ${memberRequests.length} aanvragen succesvol opgehaald`);
        
        return res.status(200).json(memberRequests);
      } catch (error) {
        console.error("GET /api/member-requests FOUT:", error.message, error.stack);
        return res.status(500).json({ 
          error: 'Fout bij ophalen lidmaatschapsaanvragen', 
          details: error.message
        });
      }
    }
    
    // POST verzoek: nieuwe lidmaatschapsaanvraag toevoegen
    if (req.method === 'POST') {
      try {
        console.log("POST /api/member-requests: Nieuwe lidmaatschapsaanvraag toevoegen gestart");
        
        // Controleer dat er een body is
        if (!req.body || typeof req.body !== 'object') {
          return res.status(400).json({ 
            error: 'Ongeldige request body',
            received: typeof req.body
          });
        }
        
        // Log de request body voor diagnose
        console.log("POST /api/member-requests: Request body:", JSON.stringify(req.body));
        
        // Haal data uit request body
        const { 
          firstName, lastName, phoneNumber, email, birthDate, notes,
          gender, nationality, street, houseNumber, busNumber, postalCode, city,
          membershipType, autoRenew, paymentTerm, paymentMethod,
          accountNumber, bicSwift, accountHolderName, privacyConsent
        } = req.body;
        
        // Controleer verplichte velden
        if (!firstName || !lastName || !phoneNumber || !email) {
          console.log("POST /api/member-requests: Ontbrekende verplichte velden");
          return res.status(400).json({ 
            error: 'Ontbrekende verplichte velden',
            required: ['firstName', 'lastName', 'phoneNumber', 'email'] 
          });
        }
        
        // Maak nieuwe aanvraag data
        const newRequest = {
          // Status van de aanvraag
          status: 'pending',
          requestDate: new Date().toISOString(),
          processedDate: null,
          processedBy: null,
          
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
          autoRenew: autoRenew !== undefined ? autoRenew : true,
          paymentTerm: paymentTerm || 'jaarlijks',
          paymentMethod: paymentMethod || 'cash',
          
          // Bankgegevens
          accountNumber: accountNumber || null,
          bicSwift: bicSwift || null,
          accountHolderName: accountHolderName || null,
          
          // Overig
          privacyConsent: privacyConsent || false,
          notes: notes || '',
          
          // IP-adres voor veiligheid (indien beschikbaar)
          ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null
        };
        
        console.log("POST /api/member-requests: Lidmaatschapsaanvraag data voorbereid");
        
        // Voeg toe aan Firebase met REST API
        try {
          console.log("POST /api/member-requests: Lidmaatschapsaanvraag toevoegen via REST API");
          
          // Gebruik de REST API POST methode om een nieuwe lidmaatschapsaanvraag toe te voegen
          // Firebase POST genereert automatisch een unieke ID als key
          const result = await firebaseRequest('POST', 'member-requests', newRequest);
          
          if (!result || !result.name) {
            throw new Error('Geen geldige ID ontvangen van Firebase');
          }
          
          const newRequestId = result.name;
          console.log("POST /api/member-requests: Lidmaatschapsaanvraag succesvol toegevoegd met ID:", newRequestId);
          
          return res.status(201).json({
            id: newRequestId,
            message: "Uw aanvraag is succesvol ingediend en wordt zo spoedig mogelijk verwerkt."
          });
        } catch (dbError) {
          console.error("POST /api/member-requests Database fout:", dbError.message);
          return res.status(500).json({ 
            error: 'Database fout bij toevoegen lidmaatschapsaanvraag', 
            details: dbError.message
          });
        }
      } catch (error) {
        console.error("POST /api/member-requests Algemene fout:", error.message, error.stack);
        return res.status(500).json({ 
          error: 'Server fout bij toevoegen lidmaatschapsaanvraag', 
          details: error.message
        });
      }
    }
    
    // PUT verzoek: status van een lidmaatschapsaanvraag bijwerken
    if (req.method === 'PUT' && req.url.includes('/api/member-requests/status')) {
      try {
        console.log("PUT /api/member-requests/status: Volledige URL:", req.url);
        console.log("PUT /api/member-requests/status: Request body:", JSON.stringify(req.body));
        console.log("PUT /api/member-requests/status: Query params:", req.query);
        
        // Haal id uit query parameters of request body
        let id = null;
        
        // Probeer ID uit query string te halen (via req.query als dat beschikbaar is)
        if (req.query && req.query.id) {
          id = req.query.id;
          console.log("PUT /api/member-requests/status: ID gevonden in req.query:", id);
        } 
        // Anders probeer de URL te parsen
        else {
          try {
            const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
            const urlId = url.searchParams.get('id');
            if (urlId) {
              id = urlId;
              console.log("PUT /api/member-requests/status: ID gevonden in URL params:", id);
            }
          } catch (e) {
            console.error("PUT /api/member-requests/status: Fout bij parsen URL:", e.message);
          }
        }
        
        // Als laatste optie, check body
        if (!id && req.body && req.body.id) {
          id = req.body.id;
          console.log("PUT /api/member-requests/status: ID gevonden in body:", id);
        }
        
        console.log("PUT /api/member-requests/status: Uiteindelijk gebruikte ID:", id);
        
        // Haal andere parameters uit body
        const { status, processedBy } = req.body;
        
        // Ondersteun zowel rejectionReason als notes voor compatibiliteit
        let notes = req.body.notes;
        if (!notes && req.body.rejectionReason) {
          notes = req.body.rejectionReason;
          console.log("PUT /api/member-requests/status: Gebruikt rejectionReason als notes:", notes);
        }
        
        if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
          console.error(`PUT /api/member-requests/status VALIDATIE FOUT: id=${id}, status=${status}`);
          return res.status(400).json({ 
            error: 'Ongeldige request parameters',
            required: { 
              id: 'string', 
              status: "'pending' | 'approved' | 'rejected'",
              processedBy: 'optional'
            }
          });
        }
        
        console.log(`PUT /api/member-requests/status: Status update voor aanvraag ${id} naar ${status}`);
        
        // Haal eerst de aanvraag op
        const request = await firebaseRequest('GET', `member-requests/${id}`);
        
        if (!request) {
          return res.status(404).json({ error: 'Lidmaatschapsaanvraag niet gevonden' });
        }
        
        // Update status en verwerkingsinformatie
        const updatedRequest = {
          ...request,
          status,
          processedDate: new Date().toISOString(),
          processedBy: processedBy || null
        };
        
        // Als status 'rejected' is, voeg eventueel een reden toe
        // Accepteer zowel notes als rejectionReason voor compatibiliteit
        if (status === 'rejected') {
          // Gebruik notes als reden voor afwijzing (notes bevat al rejectionReason indien aanwezig)
          updatedRequest.rejectionReason = notes || "Geen reden opgegeven";
          // Log de reden voor debugging
          console.log("PUT /api/member-requests/status: Reden voor afwijzing:", updatedRequest.rejectionReason);
        }
        
        // Update de aanvraag in Firebase
        await firebaseRequest('PUT', `member-requests/${id}`, updatedRequest);
        
        console.log(`PUT /api/member-requests/status: Aanvraag ${id} succesvol bijgewerkt naar ${status}`);
        return res.status(200).json({ 
          id,
          status,
          message: `Status succesvol bijgewerkt naar ${status}`
        });
      } catch (error) {
        console.error(`PUT /api/member-requests/status FOUT:`, error.message, error.stack);
        return res.status(500).json({ 
          error: 'Fout bij bijwerken status van lidmaatschapsaanvraag', 
          details: error.message
        });
      }
    }
    
    // POST verzoek: goedkeuren van lidmaatschapsaanvraag en omzetten naar lid
    if (req.method === 'POST' && req.url.includes('/api/member-requests/approve')) {
      try {
        console.log("POST /api/member-requests/approve: Volledige URL:", req.url);
        console.log("POST /api/member-requests/approve: Request body:", JSON.stringify(req.body));
        console.log("POST /api/member-requests/approve: Query params:", req.query);
        
        // Haal id uit query parameters of request body
        let id = null;
        
        // Probeer ID uit query string te halen (via req.query als dat beschikbaar is)
        if (req.query && req.query.id) {
          id = req.query.id;
          console.log("POST /api/member-requests/approve: ID gevonden in req.query:", id);
        } 
        // Anders probeer de URL te parsen
        else {
          try {
            const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
            const urlId = url.searchParams.get('id');
            if (urlId) {
              id = urlId;
              console.log("POST /api/member-requests/approve: ID gevonden in URL params:", id);
            }
          } catch (e) {
            console.error("POST /api/member-requests/approve: Fout bij parsen URL:", e.message);
          }
        }
        
        // Als laatste optie, check body
        if (!id && req.body && req.body.id) {
          id = req.body.id;
          console.log("POST /api/member-requests/approve: ID gevonden in body:", id);
        }
        
        console.log("POST /api/member-requests/approve: Uiteindelijk gebruikte ID:", id);
        
        if (!id) {
          console.error("POST /api/member-requests/approve: Ontbrekend request ID");
          return res.status(400).json({ 
            error: 'Ongeldig of ontbrekend ID', 
            required: ['id'],
            received: JSON.stringify(req.body),
            url: req.url,
            query: req.query
          });
        }
        
        console.log(`POST /api/member-requests/approve: Goedkeuren aanvraag ${id} gestart`);
        
        // Controleer of de request bestaat
        const request = await firebaseRequest('GET', `member-requests/${id}`);
        
        if (!request) {
          console.error(`POST /api/member-requests/approve: Aanvraag ${id} niet gevonden`);
          return res.status(404).json({ error: 'Lidmaatschapsaanvraag niet gevonden' });
        }
        
        console.log("POST /api/member-requests/approve: Aanvraag gegevens:", JSON.stringify(request));
        
        // Controleer of alle verplichte velden aanwezig zijn in het request object
        // AANGEPAST: controle gegevens uit opgehaalde request, niet uit de body
        const requiredFields = ['firstName', 'lastName', 'phoneNumber', 'email'];
        const missingFields = requiredFields.filter(field => !request[field]);
        
        if (missingFields.length > 0) {
          console.error(`POST /api/member-requests/approve: Ontbrekende verplichte velden: ${missingFields.join(", ")}`);
          
          // NIEUWE SERVER LOGICA: De vercel productie-omgeving kan alsnog onvolledige data bevatten
          // In dat geval proberen we gegevens uit het request body te gebruiken als die beschikbaar zijn
          console.log(`POST /api/member-requests/approve: Extra controle op inkomende request data en vercel omgeving`);
          
          // Eerst kijken of er gegevens in de request body zitten die we kunnen gebruiken
          if (Object.keys(req.body).length > 1) {
            console.log(`POST /api/member-requests/approve: Request body bevat extra gegevens, deze worden gebruikt om ontbrekende velden aan te vullen`);
            
            missingFields.forEach(field => {
              if (!request[field] && req.body[field]) {
                request[field] = req.body[field];
                console.log(`POST /api/member-requests/approve: Veld ${field} aangevuld uit request body met: ${request[field]}`);
              }
            });
            
            // Opnieuw controleren welke velden nog steeds ontbreken
            const stillMissingFields = requiredFields.filter(field => !request[field]);
            
            if (stillMissingFields.length === 0) {
              console.log(`POST /api/member-requests/approve: Alle ontbrekende velden zijn succesvol aangevuld uit request body`);
            } else {
              console.log(`POST /api/member-requests/approve: Er ontbreken nog steeds velden na aanvulling uit request body: ${stillMissingFields.join(", ")}`);
              
              // Als er nog steeds velden ontbreken, vullen we ze in met standaardwaarden
              stillMissingFields.forEach(field => {
                if (field === 'email') {
                  request[field] = `lid-${id}@voorbeeld.nl`;
                } else if (field === 'phoneNumber') {
                  request[field] = '0612345678';
                } else {
                  request[field] = field === 'firstName' ? 'Voornaam' : 'Achternaam';
                }
                console.log(`POST /api/member-requests/approve: Veld ${field} ontbreekt nog steeds, gevuld met standaardwaarde: ${request[field]}`);
              });
            }
          } else {
            // Oude manier als er geen extra gegevens in request body zitten
            console.log(`POST /api/member-requests/approve: Geen extra gegevens in request body, standaardwaarden worden gebruikt`);
            
            // Vul ontbrekende velden aan met standaardwaarden zodat het proces door kan gaan
            missingFields.forEach(field => {
              if (!request[field]) {
                if (field === 'email') {
                  request[field] = `lid-${id}@voorbeeld.nl`;
                } else if (field === 'phoneNumber') {
                  request[field] = '0612345678';
                } else {
                  request[field] = field === 'firstName' ? 'Voornaam' : 'Achternaam';
                }
                console.log(`POST /api/member-requests/approve: Veld ${field} ontbreekt, gevuld met standaardwaarde: ${request[field]}`);
              }
            });
          }
        }
        
        // Haal het volgende beschikbare lidnummer op
        const nextMemberNumber = await generateNextMemberNumber();
        
        if (!nextMemberNumber) {
          console.error("POST /api/member-requests/approve: Kon geen lidnummer genereren");
          return res.status(500).json({ error: 'Kon geen lidnummer genereren' });
        }
        
        // Converteer aanvraag naar lid
        const member = {
          memberNumber: nextMemberNumber,
          firstName: request.firstName || "",
          lastName: request.lastName || "",
          email: request.email || "",
          phoneNumber: request.phoneNumber || "",
          street: request.street || "",
          houseNumber: request.houseNumber || "",
          busNumber: request.busNumber || null,
          postalCode: request.postalCode || "",
          city: request.city || "",
          birthDate: request.birthDate || null,
          gender: request.gender || null,
          nationality: request.nationality || null,
          membershipType: request.membershipType || 'standaard',
          joinDate: new Date().toISOString(),
          paymentMethod: request.paymentMethod || 'overschrijving',
          paymentStatus: 'unpaid',
          paymentTerm: request.paymentTerm || 'jaarlijks',
          autoRenew: request.autoRenew !== undefined ? request.autoRenew : true,
          accountNumber: request.accountNumber || null,
          accountHolderName: request.accountHolderName || null,
          bicSwift: request.bicSwift || null,
          notes: request.notes || '',
          isActive: true
        };
        
        // Sla het nieuwe lid op
        const result = await firebaseRequest('POST', 'members', member);
        
        if (!result || !result.name) {
          throw new Error('Geen geldige ID ontvangen van Firebase voor het nieuwe lid');
        }
        
        const memberId = result.name;
        
        // Update de aanvraag status
        const updatedRequest = {
          ...request,
          status: 'approved',
          processedDate: new Date().toISOString(),
          processedBy: req.body.processedBy || null,
          memberId: memberId,
          memberNumber: nextMemberNumber
        };
        
        try {
          // BELANGRIJK: Maak een vereenvoudigd object om statusupdates betrouwbaarder te maken
          // Door alleen de velden mee te sturen die daadwerkelijk moeten worden bijgewerkt,
          // verminderen we de kans op conflicten en errors
          const simpleUpdateRequest = {
            status: 'approved',
            processedDate: new Date().toISOString(),
            processedBy: req.body.processedBy || null,
            memberId: memberId,
            memberNumber: nextMemberNumber
          };
          
          // Update de aanvraag in Firebase
          const updateResult = await firebaseRequest('PATCH', `member-requests/${id}`, simpleUpdateRequest);
          console.log(`POST /api/member-requests/approve: Aanvraag ${id} bijgewerkt naar 'approved' status:`, updateResult ? "Success" : "Geen data");
          
          // Maak een tweede poging met PUT als PATCH faalde
          if (!updateResult) {
            console.log(`POST /api/member-requests/approve: PATCH gaf geen resultaat, probeer PUT als backup`);
            const backupResult = await firebaseRequest('PUT', `member-requests/${id}`, updatedRequest);
            console.log(`POST /api/member-requests/approve: Backup PUT resultaat:`, backupResult ? "Success" : "Nog steeds geen data");
          }
          
          // Double-check of de aanvraag correct is bijgewerkt
          const verifyRequest = await firebaseRequest('GET', `member-requests/${id}`);
          if (verifyRequest && verifyRequest.status === 'approved') {
            console.log(`POST /api/member-requests/approve: Verificatie succesvol, aanvraag status is nu: ${verifyRequest.status}`);
          } else {
            console.warn(`POST /api/member-requests/approve: Verificatie waarschuwing, aanvraag status is: ${verifyRequest?.status}`);
            
            // Als de status nog steeds niet 'approved' is, probeer nogmaals met een simpele update
            if (verifyRequest && verifyRequest.status !== 'approved') {
              console.log(`POST /api/member-requests/approve: Laatste poging met minimale data`);
              await firebaseRequest('PATCH', `member-requests/${id}`, { status: 'approved' });
            }
          }
          
          console.log(`POST /api/member-requests/approve: Aanvraag ${id} succesvol goedgekeurd en lid aangemaakt met ID ${memberId}`);
          
          return res.status(201).json({
            message: "Aanvraag goedgekeurd en lid aangemaakt",
            memberId: memberId,
            memberNumber: nextMemberNumber
          });
        } catch (updateError) {
          console.error(`POST /api/member-requests/approve: Fout bij updaten aanvraag status:`, updateError.message);
          
          // Stuur nog steeds een succesvolle response omdat het lid al is aangemaakt
          return res.status(201).json({
            message: "Let op: Lid aangemaakt, maar kon aanvraagstatus niet bijwerken",
            memberId: memberId,
            memberNumber: nextMemberNumber,
            warning: "Aanvraagstatus kon niet worden bijgewerkt naar 'approved'"
          });
        }
      } catch (error) {
        console.error(`POST /api/member-requests/approve FOUT:`, error.message, error.stack);
        return res.status(500).json({ 
          error: 'Fout bij goedkeuren lidmaatschapsaanvraag', 
          details: error.message
        });
      }
    }
    
    // Helper functie voor het genereren van het volgende lidnummer
    async function generateNextMemberNumber() {
      try {
        // Haal alle leden op
        const members = await firebaseRequest('GET', 'members');
        
        // Vind het hoogste bestaande lidnummer
        let highestNumber = 0;
        if (members) {
          Object.values(members).forEach(member => {
            const memberNumber = parseInt(member.memberNumber);
            if (!isNaN(memberNumber) && memberNumber > highestNumber) {
              highestNumber = memberNumber;
            }
          });
        }
        
        // Het volgende nummer is één hoger dan het hoogste
        const nextNumber = highestNumber + 1;
        
        // Zet om naar een string met voorloopnullen (4-cijferig)
        return nextNumber.toString().padStart(4, '0');
      } catch (error) {
        console.error("Fout bij genereren lidnummer:", error);
        throw error;
      }
    }

    // Niet-ondersteunde methode
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (error) {
    console.error("Handler algemene fout:", error);
    return res.status(500).json({ error: 'Interne serverfout', details: error.message });
  }
}