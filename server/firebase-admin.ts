import { initializeApp, cert, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getDatabase, Database } from 'firebase-admin/database';

// Controleer of de app al is geïnitialiseerd om dubbele initialisatie te voorkomen
let firebaseAdmin: App | undefined;

try {
  if (getApps().length === 0) {
    console.log('Firebase Admin SDK initialiseren...');

    // Gebruik een fallback mechanisme voor environments waar de credentials mogelijk ontbreken
    let credential;
    try {
      credential = cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'mefen-leden-default-rtdb',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        // Verschillende platforms slaan de private key op verschillende manieren op
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
      });
    } catch (credError) {
      console.warn('Kon geen Firebase credential aanmaken met environment variables, probeer met application default credentials');
      
      // In een ontwikkelomgeving, probeer eenvoudige verbinding
      credential = undefined;
    }
    
    // Initialiseer de app met de credential (of undefined als die niet kon worden aangemaakt)
    firebaseAdmin = initializeApp({
      credential,
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://mefen-leden-default-rtdb.europe-west1.firebasedatabase.app'
    });
    
    console.log('Firebase Admin SDK geïnitialiseerd');
  } else {
    console.log('Firebase Admin SDK was al geïnitialiseerd');
    firebaseAdmin = getApp();
  }
} catch (error) {
  console.error('Fout bij initialiseren Firebase Admin SDK:', error);
}

export default firebaseAdmin;
export const auth = getAuth(firebaseAdmin);
export const db = getDatabase(firebaseAdmin);

// Utility functie voor Firebase REST API requests - directe REST API aanroepen zonder token
export async function firebaseAdminRequest(method: string, path: string, data: any = null): Promise<any> {
  // Gebruik directe database toegang met de openbare REST API
  // De Firebase rules moeten deze toegang toestaan
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'mefen-leden-default-rtdb';
  const databaseUrl = process.env.FIREBASE_DATABASE_URL || 
                      process.env.VITE_FIREBASE_DATABASE_URL || 
                      `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app`;
  
  // De '.json' extensie is nodig voor REST API toegang
  const url = `${databaseUrl}/${path}.json`;
  console.log(`Firebase direct REST API request naar: ${url}`);
  
  // Gebruik node-fetch voor HTTP-verzoeken
  const fetch = (await import('node-fetch')).default;
  
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    console.log(`Opties voor verzoek:`, options);
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`Firebase API error response: ${responseText}`);
      throw new Error(`Firebase API fout: ${response.status} ${response.statusText} - ${responseText}`);
    }
    
    // Als de respons leeg is, return null
    if (!responseText.trim()) {
      return null;
    }
    
    // Anders parse de JSON
    return JSON.parse(responseText);
  } catch (error: any) {
    console.error(`Firebase API fout (${method} ${path}):`, error);
    throw error;
  }
}