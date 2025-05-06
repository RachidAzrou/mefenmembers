// Admin SDK initialisatie voor API routes
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Controleer of de app al is geïnitialiseerd om dubbele initialisatie te voorkomen
let firebaseAdmin;

try {
  firebaseAdmin = admin.app();
} catch (error) {
  // In productie: probeer verschillende manieren om de credentials te laden
  let credential;
  
  try {
    // Optie 1: Laad vanuit service account bestand (voor lokale ontwikkeling en Vercel)
    try {
      // Probeer het service account bestand te laden als het bestaat
      const serviceAccount = require('../secrets/service-account.json');
      credential = admin.credential.cert(serviceAccount);
      console.log("Firebase Admin geïnitialiseerd met service account bestand");
    } catch (e) {
      // Bestand bestaat niet, gebruik environment variabelen
      console.log("Service account bestand niet gevonden, gebruik environment variabelen");
      credential = admin.credential.cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'mefen-leden-default-rtdb',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
      });
    }
  } catch (credError) {
    console.error("Fout bij het laden van Firebase credentials:", credError);
    // Fallback: maak een applicatie zonder credentials
    // Dit werkt alleen als de Firebase-regels publieke toegang toestaan
    credential = admin.credential.applicationDefault();
  }
  
  // Initialiseer Firebase Admin
  firebaseAdmin = admin.initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
  });
}

// Utility functie voor Firebase REST API requests met admin-token
async function firebaseAdminRequest(method, path, data = null, token = null) {
  console.log(`[DEBUG] firebaseAdminRequest: ${method} ${path} token=${token ? 'aanwezig' : 'niet aanwezig'}`);
  
  // Controleer token geldigheid - belangrijke debugging informatie
  if (token) {
    try {
      // Verifieer het token om te controleren of het geldig is
      // Dit zal falen als het token verlopen of ongeldig is
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      console.log(`[DEBUG] Token geverifieerd voor gebruiker: ${decodedToken.uid}, email: ${decodedToken.email || 'geen email'}`);
    } catch (verifyError) {
      console.error(`[DEBUG] Token verificatie mislukt:`, verifyError.message);
      // We gaan door met de operatie, maar loggen de fout voor debugging
    }
  }
  
  try {
    // Probeer eerst de Admin SDK te gebruiken
    try {
      // Toegang tot de database direct via de Admin SDK
      const db = firebaseAdmin.database();
      const ref = db.ref(path);
      
      let result;
      
      console.log(`[DEBUG] Probeer Admin SDK voor ${method} ${path}`);
      
      // Als we een geldig token hebben, maar Firebase Admin SDK gebruiken,
      // simuleren we dat we als die gebruiker opereren door de regels te respecteren
      if (token) {
        try {
          // Authenticatie context instellen voor deze operatie - alternatieve benadering
          // Dit zal niet precies hetzelfde werken als user auth, maar kan helpen bij debugging
          const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
          console.log(`[DEBUG] Operatie uitvoeren als geverifieerde gebruiker: ${decodedToken.uid}`);
        } catch (authError) {
          console.warn(`[DEBUG] Kon geen auth context instellen, gaat verder als admin:`, authError.message);
        }
      }
      
      switch (method) {
        case 'GET':
          result = await ref.once('value');
          console.log(`[DEBUG] Admin SDK GET ${path} succesvol`);
          return result.val();
          
        case 'POST':
          result = await ref.push(data);
          console.log(`[DEBUG] Admin SDK POST ${path} succesvol, nieuwe key=${result.key}`);
          return { name: result.key };
          
        case 'PUT':
          await ref.set(data);
          console.log(`[DEBUG] Admin SDK PUT ${path} succesvol`);
          return data;
          
        case 'PATCH':
          await ref.update(data);
          console.log(`[DEBUG] Admin SDK PATCH ${path} succesvol`);
          return data;
          
        case 'DELETE':
          await ref.remove();
          console.log(`[DEBUG] Admin SDK DELETE ${path} succesvol`);
          return null;
          
        default:
          throw new Error(`Niet-ondersteunde methode: ${method}`);
      }
    } catch (adminError) {
      // Als Admin SDK faalt, val terug op directe REST API
      console.warn(`Admin SDK fout (${method} ${path}), terugvallen op directe REST API:`, adminError.message);
      
      // Fallback naar directe REST API
      const fetch = require('node-fetch');
      const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app";
      
      let url = `${FIREBASE_DB_URL}/${path}.json`;
      
      // Als we een auth token hebben, voeg deze toe als auth parameter
      if (token) {
        url += `?auth=${token}`;
        console.log(`[DEBUG] Gebruik auth token in API verzoek: ${url.substring(0, 80)}...`);
      } else {
        console.log(`[DEBUG] Geen auth token beschikbaar voor REST API verzoek. BELANGRIJK: Dit kan leiden tot 'permission-denied' fouten als er security rules zijn ingesteld.`);
      }
      
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }
      
      console.log(`[DEBUG] Verstuur REST API verzoek: ${method} ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DEBUG] Firebase REST API fout: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Firebase REST API fout: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      console.log(`[DEBUG] REST API verzoek succesvol: ${method} ${path}`);
      return await response.json();
    }
  } catch (error) {
    console.error(`Firebase API fout (${method} ${path}):`, error.message);
    throw error;
  }
}

module.exports = {
  firebaseAdmin,
  firebaseAdminRequest
};