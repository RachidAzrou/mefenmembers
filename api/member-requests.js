// Implementatie die alleen gebruik maakt van directe HTTP aanroepen naar Firebase REST API
// Voor het verwerken van lidmaatschapsaanvragen (member-requests)
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
        // Haal ID, status, processedBy en notes (rejectionReason) uit de request body
        const { id, status, processedBy, notes, rejectionReason } = req.body;
        
        console.log("Request body voor status update:", JSON.stringify(req.body));
        
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
          // Prioriteer rejectionReason, val terug op notes als geen rejectionReason aanwezig is
          updatedRequest.rejectionReason = rejectionReason || notes || "Geen reden opgegeven";
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
    
    // Niet-ondersteunde methode
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  } catch (error) {
    console.error("Handler algemene fout:", error);
    return res.status(500).json({ error: 'Interne serverfout', details: error.message });
  }
}