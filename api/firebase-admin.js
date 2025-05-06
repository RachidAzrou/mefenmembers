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
async function firebaseAdminRequest(method, path, data = null) {
  try {
    // Probeer eerst de Admin SDK te gebruiken
    try {
      // Toegang tot de database direct via de Admin SDK
      const db = firebaseAdmin.database();
      const ref = db.ref(path);
      
      let result;
      
      switch (method) {
        case 'GET':
          result = await ref.once('value');
          return result.val();
          
        case 'POST':
          result = await ref.push(data);
          return { name: result.key };
          
        case 'PUT':
          await ref.set(data);
          return data;
          
        case 'PATCH':
          await ref.update(data);
          return data;
          
        case 'DELETE':
          await ref.remove();
          return null;
          
        default:
          throw new Error(`Niet-ondersteunde methode: ${method}`);
      }
    } catch (adminError) {
      // Als Admin SDK faalt, val terug op directe REST API (werkt als de database regels openbaar zijn)
      console.warn(`Admin SDK fout (${method} ${path}), terugvallen op directe REST API:`, adminError.message);
      
      // Fallback naar directe REST API
      const fetch = require('node-fetch');
      const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || "https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app";
      
      const url = `${FIREBASE_DB_URL}/${path}.json`;
      console.log(`Fallback naar directe REST API: ${method} ${url}`);
      
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Firebase REST API fout: ${response.status} ${response.statusText}`);
      }
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